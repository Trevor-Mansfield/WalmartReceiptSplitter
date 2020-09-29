from django.urls import path, re_path

from . import views

urlpatterns = [
    path('upload/receipt/', views.add_receipt),
    path('upload/items/', views.add_items),
    re_path('user/(.*)/', views.get_user),
    path('users/', views.get_user),
    re_path(r'receipt/(.*)/', views.get_receipt),
    path('receipts/', views.get_receipt),
    path('valid_receipts/', views.get_valid_receipts),
    re_path(r'.*/$', views.index),
]
