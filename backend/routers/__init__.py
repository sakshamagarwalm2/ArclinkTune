from .models import router as models_router
from .training import router as training_router
from .chat import router as chat_router
from .system import router as system_router

__all__ = ["models_router", "training_router", "chat_router", "system_router"]
