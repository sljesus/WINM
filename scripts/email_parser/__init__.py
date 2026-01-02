"""
Parsers de emails bancarios para WINM
"""

from .base import BaseParser
from .bbva import BBVAParser
from .mercado_pago import MercadoPagoParser
from .nu import NUParser
from .plata_card import PlataCardParser

__all__ = [
    'BaseParser',
    'BBVAParser',
    'MercadoPagoParser',
    'NUParser',
    'PlataCardParser'
]
