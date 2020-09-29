from django.contrib import admin

from .models import Receipt, Item, User, Cover, Payment

admin.site.register(Receipt)
admin.site.register(Item)
admin.site.register(User)
admin.site.register(Cover)
admin.site.register(Payment)
