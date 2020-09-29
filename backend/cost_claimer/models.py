from decimal import Decimal

from django.db import models


class User(models.Model):
    username = models.CharField(max_length=16)
    # Passwords are NOT SECURED
    password = models.CharField(max_length=32, default=None, blank=True, null=True)
    name = models.CharField(max_length=16)
    # Bit Flag for this user
    buy_indexes = [
        (1, "Roommate 1"),
        (2, "Roommate 2"),
        (4, "Roommate 3"),
        (8, "Roommate 4"),
        (16, "Roommate 5"),
        (32, "Roommate 6"),
        (64, "Roommate 7"),
        (128, "Roommate 8"),
    ]
    buy_index = models.PositiveIntegerField(primary_key=True, choices=buy_indexes, default=0)

    def __str__(self):
        return "{} ({})".format(self.name, self.get_buy_index_display())


class Receipt(models.Model):
    date = models.DateField(primary_key=True)
    subtotal = models.DecimalField(max_digits=5, decimal_places=2)
    tax = models.DecimalField(max_digits=5, decimal_places=2)
    total = models.DecimalField(max_digits=5, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=4)
    payer = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return "Receipt for ${} on {}".format(self.total, self.date)


class Item(models.Model):
    name = models.CharField(max_length=192)
    count = models.PositiveIntegerField(default=0)
    price = models.DecimalField(max_digits=5, decimal_places=2)
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE)
    imgSrc = models.CharField(max_length=192)
    taxed = models.BooleanField(default=False)
    buyers = models.PositiveIntegerField(default=0)

    def join_buyers(self):
        return ", ".join([buyNames[1] for buyNames in User.buy_indexes if self.buyers & buyNames[0]])

    def get_buyer_set(self):
        return {buy_index[0] for buy_index in User.buy_indexes if self.buyers & buy_index[0]}

    def makeURL(self):
        return "static/receipt_items/{}/{}".format(self.receipt.date, self.imgSrc)

    def __str__(self):
        return "{} x {} bought on {} for ${}".format(self.count, self.name, self.receipt.date, self.price)


class Cover(models.Model):
    transaction = models.ForeignKey(Receipt, on_delete=models.CASCADE, blank=True, null=True)
    transaction_payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="coverer")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="coveree")
    amount = models.DecimalField(max_digits=5, decimal_places=2)

    quantizer = Decimal("0.01")

    def __str__(self):
        return "{} covered {} ${}".format(self.transaction_payer.name, self.user.name, self.amount)


class Payment(models.Model):
    transaction = models.ForeignKey(Receipt, on_delete=models.CASCADE, blank=True, null=True)
    transaction_payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payee")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payer")
    amount = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return "{} paid {} ${}".format(self.user.name, self.transaction_payer.name, self.amount)

