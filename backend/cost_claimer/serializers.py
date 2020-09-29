from rest_framework import serializers
from .models import Receipt, Item, User


class ReceiptSerializer(serializers.ModelSerializer):

    class Meta:
        model = Receipt
        fields = ("date", "subtotal", "tax", "total", "tax_rate")


class ItemSerializer(serializers.ModelSerializer):
    buyer_names = serializers.CharField(source="join_buyers")
    src = serializers.CharField(source="makeURL")

    class Meta:
        model = Item
        fields = ("name", "count", "price", "src", "taxed", "buyer_names", "id")


class UserSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="buy_index")

    class Meta:
        model = User
        fields = ("name", "user_id")
