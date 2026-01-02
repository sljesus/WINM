"""
Parser base para emails bancarios
WINM - What I Need Most
Principio SOLID: Open/Closed - Extensible sin modificar código base
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional
import re
from datetime import datetime


class BaseParser(ABC):
    """
    Clase base para parsers de emails bancarios.
    Sigue principio SOLID: Open/Closed - Extensible sin modificar.
    """
    
    def __init__(self, source_name: str):
        """
        Inicializa el parser base.
        
        Args:
            source_name: Nombre de la fuente (ej: 'BBVA', 'Mercado Pago')
        """
        self.source_name = source_name
    
    @abstractmethod
    def parse(self, email_content: Dict) -> Optional[Dict]:
        """
        Parsea el contenido de un email y extrae información de transacción.
        Método abstracto que debe implementar cada parser específico.
        
        Args:
            email_content: Diccionario con contenido del email:
                - subject: Asunto
                - body: Cuerpo del mensaje
                - from: Remitente
                - date: Fecha
        
        Returns:
            Dict con datos de transacción o None si no es una transacción válida
        """
        pass
    
    def extract_amount(self, text: str) -> Optional[float]:
        """
        Extrae monto de un texto.
        Helper compartido (KISS - simple y directo).
        
        Args:
            text: Texto que contiene el monto
        
        Returns:
            float: Monto extraído o None si no se encuentra
        """
        # Buscar patrones comunes: $1,234.56, 1234.56, 1,234.56 MXN, etc.
        patterns = [
            r'\$\s*([\d,]+\.?\d*)',  # $1,234.56
            r'([\d,]+\.?\d*)\s*(?:MXN|pesos|peso)',  # 1234.56 MXN
            r'([\d,]+\.?\d*)',  # 1234.56
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.replace(',', ''))
            if match:
                try:
                    amount = float(match.group(1).replace(',', ''))
                    return amount
                except ValueError:
                    continue
        
        return None
    
    def extract_date(self, text: str, email_date: str = None) -> Optional[str]:
        """
        Extrae fecha de un texto o usa fecha del email.
        Helper compartido (KISS).
        
        Args:
            text: Texto que puede contener fecha
            email_date: Fecha del email como fallback
        
        Returns:
            str: Fecha en formato ISO (YYYY-MM-DDTHH:MM:SSZ) o None
        """
        # Intentar extraer fecha del texto
        date_patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',  # DD/MM/YYYY o DD-MM-YYYY
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',  # YYYY/MM/DD
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if len(match.group(1)) == 4:  # YYYY/MM/DD
                        year, month, day = match.groups()
                    else:  # DD/MM/YYYY
                        day, month, year = match.groups()
                    
                    # Construir fecha ISO
                    date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}T00:00:00Z"
                    return date_str
                except (ValueError, IndexError):
                    continue
        
        # Si no se encuentra en el texto, usar fecha del email
        if email_date:
            try:
                # Intentar parsear fecha del email (formato RFC 2822)
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(email_date)
                return dt.isoformat() + 'Z'
            except (ValueError, TypeError):
                pass
        
        # Fallback: usar fecha actual
        return datetime.now().isoformat() + 'Z'
    
    def normalize_description(self, text: str) -> str:
        """
        Normaliza descripción de transacción.
        Helper compartido (KISS).
        
        Args:
            text: Texto a normalizar
        
        Returns:
            str: Descripción normalizada
        """
        # Limpiar espacios múltiples
        text = re.sub(r'\s+', ' ', text)
        # Eliminar caracteres especiales al inicio/fin
        text = text.strip('.,;:!?')
        # Limitar longitud
        if len(text) > 200:
            text = text[:197] + '...'
        
        return text.strip()
    
    def validate_transaction(self, data: Dict) -> bool:
        """
        Valida que los datos de transacción sean correctos.
        Helper compartido (KISS).
        
        Args:
            data: Diccionario con datos de transacción
        
        Returns:
            bool: True si es válido, False si no
        """
        required_fields = ['amount', 'description', 'date', 'source', 'transaction_type']
        
        # Verificar campos requeridos
        for field in required_fields:
            if field not in data or data[field] is None:
                return False
        
        # Verificar que amount sea numérico
        try:
            float(data['amount'])
        except (ValueError, TypeError):
            return False
        
        # Verificar que transaction_type sea válido
        valid_types = ['compra', 'ingreso', 'transferencia', 'retiro', 'otro']
        if data['transaction_type'] not in valid_types:
            return False
        
        # Verificar que source sea válido
        valid_sources = ['Mercado Pago', 'NU', 'Plata Card', 'BBVA']
        if data['source'] not in valid_sources:
            return False
        
        return True
    
    def is_transaction_email(self, email_content: Dict) -> bool:
        """
        Determina si un email es una notificación de transacción.
        Método helper que puede sobrescribirse en parsers específicos.
        
        Args:
            email_content: Contenido del email
        
        Returns:
            bool: True si es una transacción, False si no
        """
        subject = email_content.get('subject', '').lower()
        body = email_content.get('body', '').lower()
        
        # Palabras clave que indican transacción
        transaction_keywords = [
            'compra', 'pago', 'cargo', 'abono', 'transferencia',
            'retiro', 'deposito', 'transaccion', 'movimiento'
        ]
        
        # Verificar si contiene palabras clave
        text = f"{subject} {body}"
        return any(keyword in text for keyword in transaction_keywords)
    
    def determine_transaction_type(self, text: str) -> str:
        """
        Determina el tipo de transacción basado en el texto.
        Helper compartido (KISS).
        
        Args:
            text: Texto del email
        
        Returns:
            str: Tipo de transacción ('compra', 'ingreso', 'retiro', etc.)
        """
        text_lower = text.lower()
        
        # Palabras clave para cada tipo
        if any(word in text_lower for word in ['compra', 'cargo', 'pago', 'gasto']):
            return 'compra'
        elif any(word in text_lower for word in ['ingreso', 'abono', 'deposito', 'recibiste']):
            return 'ingreso'
        elif any(word in text_lower for word in ['retiro', 'retiraste', 'sacar']):
            return 'retiro'
        elif any(word in text_lower for word in ['transferencia', 'transferiste']):
            return 'transferencia'
        else:
            return 'otro'
