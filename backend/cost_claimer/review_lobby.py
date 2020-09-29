from threading import Timer
from functools import wraps
from collections import defaultdict
from decimal import Decimal, ROUND_UP

from django.core.exceptions import ValidationError
from asgiref.sync import async_to_sync

from .models import Receipt, Item, User, Cover
from .serializers import ItemSerializer, UserSerializer


# Placeholder for random things before they are initialized with real values.
class _Placeholder:
    buyers = None
    id = None

    @staticmethod
    def cancel():
        pass

    @staticmethod
    def save():
        pass


def require_lock(func):
    @wraps(func)
    def func_requiring_lock(self, *args):
        with self._lock:
            return func(self, *args)

    return func_requiring_lock


def recalculate_receipt(receipt):
    items = Item.objects.filter(receipt=receipt, buyers__gt=0)
    tax_rate = receipt.tax_rate + 1
    amounts = defaultdict(lambda: Decimal("0.00"))
    for item in items:
        buyers = [buy_index for buy_index, _ in User.buy_indexes if item.buyers & buy_index]
        item_cost = item.count * item.price
        if item.taxed:
            item_cost *= tax_rate
        share = item_cost / len(buyers)
        for buyer in buyers:
            amounts[buyer] += share
    amounts = {user: amount.quantize(Cover.quantizer, rounding=ROUND_UP) for user, amount in amounts.items()}
    users = User.objects.all()
    for user in users:
        if user != receipt.payer:
            cover = Cover.objects.filter(transaction=receipt, user=user).first()
            if cover:
                if user.buy_index in amounts:
                    cover.amount = amounts[user.buy_index]
                    cover.save()
                else:
                    cover.delete()
            elif user.buy_index in amounts:
                Cover(transaction=receipt, transaction_payer=receipt.payer,
                      user=user, amount=amounts[user.buy_index]).save()
    return amounts


class GroupLobbyOrganizer(object):
    _lobbies = {}

    @classmethod
    def get_lobby(cls, receipt_date, channel_layer):
        if receipt_date in cls._lobbies:
            return cls._lobbies[receipt_date]
        try:
            receipt = Receipt.objects.filter(date=receipt_date).first()
        except ValidationError:
            return None
        if receipt:
            newLobby = cls.Lobby(channel_layer, receipt)
            cls._lobbies[receipt_date] = newLobby
            return newLobby
        return None

    @classmethod
    def delete_lobby(cls, receipt_date):
        cls._lobbies.pop(receipt_date)

    # This class is nested because Lobbies should be obtained from the Organizer and not made on their own.
    class Lobby(object):

        def __init__(self, channel_layer, receipt):
            self.channel_layer = channel_layer
            self.receipt = receipt
            self.receipt_date = str(receipt.date)
            self.all_users = set()
            self.active_users = set()
            self.exclusive_active_user = None
            self.ticks = 5
            self.timer = _Placeholder
            self.on_tick_finish = self.start_item_viewing
            self.tick_condition = lambda: len(self.active_users) == len(self.all_users)
            self.items = []
            self.item_iter = None
            self.item = _Placeholder

        def is_counting_down(self):
            return self.ticks < 5

        def has_viewing_started(self):
            return self.on_tick_finish != self.start_item_viewing

        def add_user(self, user):
            user_id = user.buy_index
            self.all_users.add(user_id)
            self.update_users()

        def get_current_state(self):
            return {
                "all_users": list(self.all_users),
                "active_users": list(self.active_users),
                "exclusive_active_user":
                    None if self.exclusive_active_user is None else UserSerializer(self.exclusive_active_user).data,
                "time": self.ticks + 1 if self.is_counting_down() else None,
                "item": ItemSerializer(self.item).data if self.has_viewing_started() else None,
            }

        def remove_user(self, user):
            user_id = user.buy_index
            self.all_users.discard(user_id)
            if len(self.all_users) > 0:
                if not self.has_viewing_started():
                    self.active_users.discard(user_id)
                self.update_users()
            else:
                GroupLobbyOrganizer.delete_lobby(self.receipt_date)
                self.timer.cancel()
                if self.has_viewing_started:
                    recalculate_receipt(self.receipt)

        def activate_user(self, user):
            if self.exclusive_active_user is None:
                self.active_users.add(user.buy_index)
                self.update_users()

        def deactivate_user(self, user):
            if self.exclusive_active_user is None:
                self.active_users.discard(user.buy_index)
                self.update_users()

        def activate_exclusive_user(self, user, item_id):
            if self.exclusive_active_user is None and self.item.id == item_id:
                self.timer.cancel()
                self.exclusive_active_user = user
                self.active_users = {user.buy_index}
                async_to_sync(self.channel_layer.group_send)(
                    self.receipt_date,
                    {
                        "type": "lobby_update",
                        "update": {
                            "type": "lobby_item_claim",
                            "user": UserSerializer(user).data,
                        }
                    }
                )
                self.ticks = 2
                self.tick()

        def update_users(self):
            self.check_tick()
            async_to_sync(self.channel_layer.group_send)(
                self.receipt_date,
                {
                    "type": "lobby_update",
                    "update": {
                        "type": "lobby_user_change",
                        "all_users": list(self.all_users),
                        "active_users": list(self.active_users),
                    }
                }
            )

        def send_time(self, time):
            async_to_sync(self.channel_layer.group_send)(
                self.receipt_date,
                {
                    "type": "lobby_update",
                    "update": {
                        "type": "lobby_time_change",
                        "time": time,
                    }
                }
            )

        def tick(self):
            # If the countdown isn't finished, keep counting down.
            if self.ticks > 0:
                self.timer = Timer(1, self.tick)
                self.timer.start()
                self.send_time(self.ticks)
                self.ticks -= 1
            # If the countdown is finished, start looking at items.
            else:
                self.ticks = 5
                self.on_tick_finish()

        def check_tick(self):
            # If the tick condition is met, start the countdown.
            if self.tick_condition():
                if not self.is_counting_down():
                    self.tick()
            # Otherwise, if the countdown is active then stop it.
            elif self.is_counting_down():
                self.timer.cancel()
                self.ticks = 5
                self.send_time(None)

        def start_item_viewing(self):
            self.tick_condition = lambda: len(self.active_users) > 0
            self.on_tick_finish = self.view_next_item
            self.items = Item.objects.filter(receipt=self.receipt)
            self.item_iter = iter(list(self.items))
            self.view_next_item()

        def update_item(self):
            buyers = 0
            for buy_index in self.active_users:
                buyers += buy_index
            self.item.buyers = buyers
            self.item.save()

        def view_next_item(self):
            self.update_item()
            try:
                self.item = next(self.item_iter)
            except StopIteration:
                GroupLobbyOrganizer.delete_lobby(self.receipt_date)
                async_to_sync(self.channel_layer.group_send)(
                    self.receipt_date,
                    {
                        "type": "lobby_update",
                        "update": {
                            "type": "lobby_finished",
                            "payer": self.receipt.payer.buy_index,
                            "shares": {str(user): str(amount) for user, amount in
                                       recalculate_receipt(self.receipt).items()},
                        },
                    }
                )
                async_to_sync(self.channel_layer.send)(
                    "user_action",
                    {
                        "type": "lobby_close",
                        "users": [user for user in self.all_users]
                    }
                )
                return
            self.exclusive_active_user = None
            self.active_users = self.item.get_buyer_set()
            async_to_sync(self.channel_layer.group_send)(
                self.receipt_date,
                {
                    "type": "lobby_update",
                    "update": {
                        "type": "lobby_item_change",
                        "item": ItemSerializer(self.item).data,
                        "active_users": list(self.active_users),
                    }
                }
            )
            self.update_users()
