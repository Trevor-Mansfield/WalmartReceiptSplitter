from bs4 import BeautifulSoup
import sys
import json
import requests
from shutil import copyfile
import os

# This should be the path from the root of the project to where receipt images should be stored.
# Use forward slashes
RELATIVE_IMAGE_EXPORT_PATH = "backend/static/receipt_items"


class Item:

    def __init__(self, name, price, imgSrc):
        self.name = name
        self.count = 1
        self.price = price
        self.imgSrc = imgSrc

    def add_another(self):
        self.count = self.count + 1

    def get_total(self):
        return self.count * self.price

    def updateImgSrc(self, newImgSrc):
        self.imgSrc = newImgSrc

    def export(self):
        return "{}|{}|{}|{}".format(self.name, self.count, self.price, self.imgSrc)

    def __str__(self):
        return "{}x{}@${}".format(self.count, self.name, self.price)

    def __repr__(self):
        return "{}x{}@${}".format(self.count, self.name if len(self.name) < 8 else self.name[:8] + "...", self.price)


class Receipt:

    def __init__(self, payer, receiptDate, taxRate="0.0800"):
        self.payer = payer
        self.date = receiptDate
        self.items = {}
        self.itemCount = 0
        self.taxRate = taxRate
        self.subtotal = 0
        self.tax = 0
        self.total = 0

    def add_item(self, name, price, imgSrc):
        if name in self.items:
            self.items[name].add_another()
        else:
            self.items[name] = Item(name, price, imgSrc)
        self.itemCount += 1

    def post(self):
        receiptResponse = requests.post("http://localhost:8000/cost_claimer/upload/receipt/", data={
            "payer": self.payer,
            "date": self.date,
            "subtotal": self.subtotal,
            "tax": self.tax,
            "total": self.total,
            "tax_rate": self.taxRate,
        })
        print(receiptResponse.content.decode("utf-8")[1:-1])
        if not receiptResponse.ok:
            print("Item Posting Aborted")
            return
        items = []
        item_src_path = "./{}_files/".format(self.date)
        cwd = os.getcwd().replace("\\", "/")
        item_dst_path = "{}/{}/{}".format(cwd[:cwd.rfind("/")], RELATIVE_IMAGE_EXPORT_PATH, "yes")
        os.makedirs(item_dst_path, exist_ok=True)
        item_dst_path += "/"
        for item in self.items.values():
            taxed = None
            print("Is {} for {} taxed? (y/n) ".format(item.name, item.price), )
            while taxed is None:
                taxed = input()
                if taxed == "y":
                    taxed = True
                elif taxed == "n":
                    taxed = False
                else:
                    print("Expected y or n")
                    taxed = None
            items.append({
                "name": item.name,
                "count": item.count,
                "price": item.price,
                "imgSrc": item.imgSrc,
                "taxed": taxed,
            })
            copyfile(item_src_path+item.imgSrc, item_dst_path+item.imgSrc)
        itemResponse = requests.post("http://localhost:8000/cost_claimer/upload/items/", data={
            "date": self.date,
            "items": json.dumps(items),
        })
        print(itemResponse.content.decode("utf-8")[1:-1])
        print("Upload complete, images were put into {}".format(item_dst_path))


def parse_receipt(receiptDate, payer):
    receipt = Receipt(payer, receiptDate)
    with open(receiptDate + ".html", "r") as receiptFile:
        receiptDoc = BeautifulSoup(receiptFile.read(), 'html.parser')
        for item in receiptDoc.find("ul", "results-list").div.contents:
            itemDetails = item.div.div
            srcSlash = itemDetails.img["src"].rfind("/")
            receipt.add_item(
                name=itemDetails.img["alt"],
                price=itemDetails.div.div.span.string[1:],
                imgSrc=itemDetails.img["src"][srcSlash+1:] if srcSlash >= 0 else itemDetails.img["src"]
            )
        totals = receiptDoc.find("div", "receipt-summary-v2").div.div.table
        receipt.subtotal = totals.tbody.tr.td.nextSibling.string[1:]
        receipt.tax = totals.tbody.tr.nextSibling.td.nextSibling.string[1:]
        receipt.total = totals.nextSibling.tr.td.nextSibling.h2.string[1:]
    receipt.post()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No receipt date given.")
        exit(1)
    receiptDate = sys.argv[1]
    user_list = json.loads(requests.get("http://localhost:8000/cost_claimer/users/").content.decode("utf-8"))
    user_list.sort(key=lambda user: user["user_id"])
    ids = set()
    print("Who paid?")
    for user in user_list:
        print("{} (id {})".format(user["name"], user["user_id"]))
        ids.add(user["user_id"])
    payer_id = int(input("Enter id: "))
    while payer_id not in ids:
        print("Unknown id")
        payer_id = int(input("Enter id: "))
    parse_receipt(receiptDate, payer_id)
