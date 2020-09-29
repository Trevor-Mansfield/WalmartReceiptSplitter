from channels.routing import ProtocolTypeRouter, ChannelNameRouter
from django.urls import path, re_path

from . import consumers


application = ProtocolTypeRouter({
    # (http->django views is added by default)
})

websocket_urlpatterns = [
    re_path('ws/cost_claimer/group_view/', consumers.GroupCostConsumer),
]
