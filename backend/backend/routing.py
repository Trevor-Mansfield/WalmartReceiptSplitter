from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter, ChannelNameRouter

import cost_claimer.routing
import cost_claimer.consumers

application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            cost_claimer.routing.websocket_urlpatterns
        )
    ),
    "channel": ChannelNameRouter({
        "user_action": cost_claimer.consumers.GroupCostWorker,
    }),
})
