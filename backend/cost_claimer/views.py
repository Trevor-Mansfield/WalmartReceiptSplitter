from django.shortcuts import redirect
from rest_framework.response import Response
from rest_framework.decorators import api_view

import json
from decimal import Decimal

from .models import Receipt, Item, User
from .serializers import ReceiptSerializer, ItemSerializer, UserSerializer


def getDecimals(data, *args):
    return [Decimal(data[key]) for key in args]


def index(request):
    hostname = request.get_host().split(":")[0]
    return redirect("http://{}:3000/".format(hostname))


@api_view(['POST'])
def add_receipt(request):
    if request.method == 'POST':
        date = request.data["date"]
        if Receipt.objects.filter(date=date).exists():
            return Response("Receipt Already Exists", status=409)
        payer = User.objects.filter(buy_index=request.data["payer"]).first()
        if payer:
            subtotal, tax, total, tax_rate = getDecimals(request.data, "subtotal", "tax", "total", "tax_rate")
            Receipt(date=date, subtotal=subtotal, tax=tax, total=total, tax_rate=tax_rate, payer=payer).save()
            return Response("Receipt Added")
        else:
            return Response("Unknown User for Payer", status=406)
    return Response("Invalid Request")


@api_view(['POST'])
def add_items(request):
    if request.method == 'POST':
        newItems = 0
        duplicateItems = 0
        date = request.data["date"]
        receipt = Receipt.objects.filter(date=date).first()
        if not receipt:
            Response("Invalid Receipt Given to Add Items To", status=400)
        items = json.loads(request.data["items"])
        for item in items:
            if Item.objects.filter(name=item["name"], receipt=date).exists():
                duplicateItems = 0
            else:
                newItems += 1
                Item(
                    receipt=receipt,
                    name=item["name"],
                    count=int(item["count"]),
                    price=Decimal(item["price"]),
                    imgSrc=item["imgSrc"],
                    taxed=item["taxed"]
                ).save()
        if newItems:
            responseText = "Added {} New Item{}".format(newItems, "s" if newItems != 1 else "")
            if duplicateItems:
                responseText += ", Ignored {} Duplicate Item{}".format(duplicateItems, "s" if duplicateItems != 1 else "")
            return Response(responseText)
        else:
            return Response("All Items Were Duplicates, None Added", status=409)
    return Response("Invalid Request")


@api_view(['GET'])
def get_user(request, roommate=None):
    if request.method == 'GET':
        data = None
        if roommate:
            roommateIndex = None
            for buy_index, buyName in User.buy_indexes:
                if buyName == roommate:
                    roommateIndex = buy_index
                    break
            if roommateIndex:
                data = User.objects.filter(buy_index=roommateIndex).first()
            if not data:
                return Response("No Associated Roommate Found")
        else:
            data = User.objects.all()
        results = UserSerializer(data, context={'request': request}, many=True).data
        return Response(results)
    return Response("Invalid Request")


@api_view(['GET'])
def get_receipt(request, receipt_date=None):
    if request.method == 'GET':
        if receipt_date:
            receiptEntry = Receipt.objects.filter(date=receipt_date).first()
            if receiptEntry:
                receiptDetails = ReceiptSerializer(receiptEntry, context={'request': request}).data
                itemList = Item.objects.filter(receipt=receiptEntry)
                itemData = ItemSerializer(itemList, context={'request': request}, many=True).data
                return Response({**dict(receiptDetails), "items": itemData})
            else:
                return Response("Receipt not found.")
        else:
            results = ReceiptSerializer(Receipt.objects.all(), context={'request': request}, many=True).data
            return Response(results)
    return Response("Invalid Request")


@api_view(['GET'])
def get_valid_receipts(request):
    if request.method == "GET":
        all_receipts = ReceiptSerializer(Receipt.objects.all(), context={'request': request}, many=True).data
        return Response([receipt["date"] for receipt in all_receipts])
