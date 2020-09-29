import json
import logging
import re as regex
from collections import defaultdict
from decimal import Decimal
from functools import wraps
from uuid import uuid1 as get_new_uuid

from channels.generic.websocket import WebsocketConsumer, SyncConsumer
from asgiref.sync import async_to_sync

from .models import User, Cover, Payment
from .review_lobby import GroupLobbyOrganizer
from .serializers import UserSerializer

logging.basicConfig(filename='log.txt', level=logging.INFO)


def log_redacted(message, obj):
    original = True
    for key in ["username", "new_username", "password", "new_password"]:
        if key in obj:
            if original:
                obj = obj.copy()
                original = False
            obj[key] = "<redacted>"
    logging.info(message, obj)


class GroupCostConsumer(WebsocketConsumer):

    def connect(self):
        self.uuid = str(get_new_uuid())
        self.group_names = set()
        self.commands = {
            "join_group": self._join_group,
            "leave_group": self._leave_group,
        }
        self._join_group(self.uuid)
        async_to_sync(self.channel_layer.send)(
            "user_action",
            {
                "uuid": self.uuid,
                "type": "session_connect",
            }
        )
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.send)(
            "user_action",
            {
                "uuid": self.uuid,
                "type": "session_disconnect",
            }
        )
        for group_name in self.group_names:
            async_to_sync(self.channel_layer.group_discard)(
                group_name,
                self.channel_name,
            )

    def receive(self, text_data=None, bytes_data=None):
        async_to_sync(self.channel_layer.send)(
            "user_action",
            {
                "uuid": self.uuid,
                "type": "session_action",
                "text_data": json.loads(text_data),
            }
        )

    # Updates from the lobby should be forwarded
    def lobby_update(self, event):
        self.send(text_data=json.dumps(event["update"]))

    # Responses are messages that don't need further processing and can be sent to the client.
    def worker_response(self, event):
        self.send(text_data=json.dumps(event["response"]))

    # Commands are messages with directions that aren't for the client.
    def worker_command(self, event):
        try:
            self.commands[event["command"]](*event["args"])
        except KeyError:
            logging.error("Unknown command: %s", event["command"])

    def _join_group(self, group_name):
        self.group_names.add(group_name)
        async_to_sync(self.channel_layer.group_add)(
            group_name,
            self.channel_name,
        )

    def _leave_group(self, group_name):
        try:
            self.group_names.remove(group_name)
            async_to_sync(self.channel_layer.group_discard)(
                group_name,
                self.channel_name,
            )
        except KeyError:
            logging.error("Tried leaving unjoined group: %s", group_name)


class Session:

    def __init__(self, uuid):
        self.uuid = uuid
        self.user = None
        self.lobby = None


def requires_login(func):
    @wraps(func)
    def func_requiring_user(self, session, *args, notify_if_invalid=True, **kwargs):
        if session.user:
            func(self, session, *args, **kwargs)
        elif notify_if_invalid:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "You must be logged in to do this.",
            })
    return func_requiring_user


def requires_lobby(func):
    @wraps(func)
    def func_requiring_lobby(self, session, *args, notify_if_invalid=True, **kwargs):
        if session.lobby:
            func(self, session, *args, **kwargs)
        elif notify_if_invalid:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "You must be in a lobby to do this.",
            })
    return func_requiring_lobby


class GroupCostWorker(SyncConsumer):

    action_params = {
        "change_password": ["password", "new_password"],
        "change_status": ["new_status"],
        "change_username": ["password", "new_username"],
        "claim_item": ["item_id"],
        "create_account": ["name", "username", "password"],
        "join_lobby": ["receipt_date"],
        "leave_lobby": [],
        "login": ["username", "password"],
        "logout": [],
        "record_payment": ["user_id", "amount"],
        "view_balances": [],
    }

    def __init__(self, scope):
        super().__init__(scope)
        self.sessions = {}
        self.user_sessions = {}

    def _respond(self, group_name, response):
        async_to_sync(self.channel_layer.group_send)(
            group_name,
            {
                "type": "worker_response",
                "response": response
            }
        )
        log_redacted("Response: %s", response)

    def _command(self, group_name, command, args):
        async_to_sync(self.channel_layer.group_send)(
            group_name,
            {
                "type": "worker_command",
                "command": command,
                "args": args,
            }
        )
        log_redacted("Command ({}): %s".format(command), args)

    def session_connect(self, event):
        uuid = event["uuid"]
        self.sessions[uuid] = Session(uuid)
        logging.info("Connected: %s", uuid)

    def session_disconnect(self, event):
        uuid = event["uuid"]
        try:
            session = self.sessions.pop(uuid)
        except KeyError:
            # Occurs when the worker and server aren't restarted together
            logging.error("Tried disconnecting unknown session %s from %s", uuid, str(self.sessions))
        else:
            self._logout(session, notify_if_invalid=False)
            logging.info("Disconnected: %s", uuid)

    def session_action(self, event):
        session, data = self.sessions[event["uuid"]], event["text_data"]
        log_redacted("Received: %s", data)

        try:
            action = data["action"]
        except KeyError:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "No Action Specified"
            })
            return

        try:
            actionParams = self.action_params[action]
            actionFunction = getattr(self, "_" + action)
        except KeyError:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "Unknown Action: " + action
            })
            return

        try:
            actionArgs = [data[param] for param in actionParams]
        except KeyError:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "Parameters required for action: " + str(actionParams),
            })
            return

        try:
            actionFunction(session, *actionArgs)
        except Exception:
            self._respond(session.uuid, {
                "type": "invalid_action",
                "message": "Something went wrong processing your request.",
            })

    def lobby_close(self, event):
        users = event["users"]
        for user in users:
            session = self.user_sessions[int(user)]
            self._command(session.uuid, "leave_group", [session.lobby.receipt_date])
            session.lobby = None

    @requires_login
    def _change_password(self, session, password, new_password):
        if session.user.password == password:
            session.user.password = new_password
            session.user.save()
            self._respond(session.uuid, {
                "type": "user_change",
                "valid": True,
                "message": "Successfully Changed Password",
            })
        else:
            self._respond(session.uuid, {
                "type": "account_error",
                "message": "Incorrect Password"
            })

    @requires_lobby
    def _change_status(self, session, new_status):
        if session.lobby:
            if new_status == "true":
                session.lobby.activate_user(session.user)
            elif new_status == "false":
                session.lobby.deactivate_user(session.user)
            else:
                self._respond(session.uuid, {
                    "type": "invalid_action",
                    "message": "Unknown status type: " + new_status,
                })

    @requires_login
    def _change_username(self, session, password, new_username):
        if session.user.password == password:
            session.user.username = new_username
            session.user.save()
            self._respond(session.uuid, {
                "type": "user_change",
                "valid": True,
                "user": UserSerializer(session.user).data,
                "message": "Successfully Changed Username",
            })
        else:
            self._respond(session.uuid, {
                "type": "account_error",
                "message": "Incorrect Password"
            })

    @requires_lobby
    def _claim_item(self, session, item_id):
        session.lobby.activate_exclusive_user(session.user, item_id)

    def _create_account(self, session, name, username, password):
        new_user = User.objects.filter(name=name).first()
        if new_user:
            if new_user.password is None:
                if User.objects.filter(username=username).exists():
                    self._respond(session.uuid, {
                        "type": "account_error",
                        "message": "Username Already Taken",
                    })
                else:
                    new_user.username = username
                    new_user.password = password
                    new_user.save()
                    session.user = new_user
                    self.user_sessions[new_user.buy_index] = session
                    self._respond(session.uuid, {
                        "type": "user_change",
                        "valid": True,
                        "user": UserSerializer(session.user).data,
                        "message": "Account Created",
                    })
            else:
                self._respond(session.uuid, {
                    "type": "account_error",
                    "message": "Account Already Exists",
                })
        else:
            self._respond(session.uuid, {
                "type": "account_error",
                "message": "Unknown Name",
            })

    @requires_login
    def _join_lobby(self, session, receipt_date):
        self._leave_lobby(session, notify_if_invalid=False)
        lobby = GroupLobbyOrganizer.get_lobby(receipt_date, self.channel_layer)
        if lobby:
            lobby.add_user(session.user)
            session.lobby = lobby
            self._respond(session.uuid, {
                "type": "lobby_init",
                "lobby_state": lobby.get_current_state(),
            })
            self._command(session.uuid, "join_group", [receipt_date])
        else:
            self._respond(session.uuid, {
                "type": "lobby_error",
                "message": "Receipt Date Not Found",
            })

    @requires_lobby
    def _leave_lobby(self, session):
        self._command(session.uuid, "leave_group", [session.lobby.receipt_date])
        session.lobby.remove_user(session.user)
        session.lobby = None

    def _login(self, session, username, password):
        self._logout(session, notify_if_invalid=False)
        user = User.objects.filter(username=username, password=password).first()
        if user:
            if user.buy_index in self.user_sessions:
                self._respond(session.uuid, {
                    "type": "account_error",
                    "message": "You are already logged in.",
                })
            else:
                session.user = user
                self.user_sessions[user.buy_index] = session
                self._respond(session.uuid, {
                    "type": "user_change",
                    "valid": True,
                    "user": UserSerializer(session.user).data,
                    "message": "Successfully Logged In",
                })
        else:
            self._respond(session.uuid, {
                "type": "account_error",
                "message": "Invalid Login",
            })

    @requires_login
    def _logout(self, session):
        self._leave_lobby(session, notify_if_invalid=False)
        self.user_sessions.pop(session.user.buy_index)
        session.user = None
        self._respond(session.uuid, {
            "type": "user_change",
            "valid": False,
            "message": "Successfully Logged Out",
        })

    @requires_login
    def _record_payment(self, session, user_id, amount):
        if regex.match(r"/\$?\d+(?:\.\d\d)?$", amount):
            payer = User.objects.filter(buy_index=user_id).first()
            if payer:
                Payment(transaction_payer=session.user, user=payer, amount=Decimal(amount)).save()
                self._respond(session.uuid, {
                    "type": "payment_success",
                    "message": "Payment Recorded",
                })
            else:
                self._respond(session.uuid, {
                    "type": "payment_error",
                    "message": "Unknown User",
                })
        else:
            self._respond(session.uuid, {
                "type": "payment_error",
                "message": "Amount Must be a Positive Dollar Amount",
            })

    @requires_login
    def _view_balances(self, session):
        # Money that the user needs back
        all_due = defaultdict(lambda: Decimal("0.00"))
        # Money that the user needs to give back
        all_owed = defaultdict(lambda: Decimal("0.00"))

        # All the times the user covered someone
        for transaction in Cover.objects.filter(transaction_payer=session.user):
            all_due[transaction.user.buy_index] += transaction.amount
        # All the times the user was covered by someone
        for transaction in Cover.objects.filter(user=session.user):
            all_owed[transaction.transaction_payer.buy_index] += transaction.amount
        # All the times the user was paid back
        for transaction in Payment.objects.filter(transaction_payer=session.user):
            all_due[transaction.user.buy_index] -= transaction.amount
        # All the times the user paid someone back
        for transaction in Payment.objects.filter(user=session.user):
            all_owed[transaction.transaction_payer.buy_index] -= transaction.amount

        # The net money the user needs back
        net_due = {}
        # The net money that the user needs to give back
        net_owed = {}

        for user in User.objects.exclude(buy_index=session.user.buy_index):
            net_total = all_due[user.buy_index] - all_owed[user.buy_index]
            if net_total < 0:
                net_owed[str(user.buy_index)] = str(Decimal.copy_abs(net_total))
            elif net_total > 0:
                net_due[str(user.buy_index)] = str(net_total)

        self._respond(session.uuid, {
            "type": "balances",
            "net_due": net_due if len(net_due) > 0 else None,
            "net_owed": net_owed if len(net_owed) > 0 else None,
        })
