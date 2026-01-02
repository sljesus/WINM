"""
Parser para emails de NU
WINM - What I Need Most
Principio SOLID: Single Responsibility - Solo parsea emails de NU
"""

import re
from typing import Dict, Optional
from .base import BaseParser


class NUParser(BaseParser):
    """
    Parser específico para emails de NU.
    Implementación simple siguiendo principio KISS.
    """
    
    def __init__(self):
        super().__init__('NU')
    
    def parse(self, email_content: Dict) -> Optional[Dict]:
        """
        Parsea email de NU y extrae información de transacción.
        
        Args:
            email_content: Contenido del email
        
        Returns:
            Dict con datos de transacción o None si no es válido
        """
        # Filtrar solo compras e ingresos
        if not self._is_transaction_notification(email_content):
            return None
        
        subject = email_content.get('subject', '')
        body = email_content.get('body', '')
        email_id = email_content.get('id', '')
        email_date = email_content.get('date', '')
        
        # Extraer monto
        amount = self._extract_amount_from_text(body or subject)
        if amount is None:
            return None
        
        # Determinar tipo de transacción
        text_lower = (body + ' ' + subject).lower()
        
        if any(word in text_lower for word in ['recibiste', 'ingreso', 'abono']):
            transaction_type = 'ingreso'
            is_expense = False
        elif any(word in text_lower for word in ['compra', 'cargo', 'pago', 'pagaste']):
            transaction_type = 'compra'
            is_expense = True
        else:
            transaction_type = 'compra'
            is_expense = True
        
        # Extraer descripción
        description = self._extract_description(body, subject)
        
        # Extraer fecha
        date = self.extract_date(body, email_date)
        
        # Construir transacción
        transaction = {
            'amount': -abs(amount) if is_expense else abs(amount),
            'description': description,
            'date': date,
            'source': self.source_name,
            'transaction_type': transaction_type,
            'email_id': email_id,
            'email_subject': subject,
            'needs_categorization': False,
            'bank': self.source_name
        }
        
        # Validar antes de retornar
        if self.validate_transaction(transaction):
            return transaction
        
        return None
    
    def _is_transaction_notification(self, email_content: Dict) -> bool:
        """Verifica si es una notificación de transacción"""
        subject = email_content.get('subject', '').lower()
        body = email_content.get('body', '').lower()
        text = f"{subject} {body}"
        
        transaction_keywords = ['compra', 'pago', 'cargo', 'recibiste', 'transacción']
        exclude_keywords = ['promoción', 'oferta', 'publicidad', 'newsletter', 'invitación']
        
        has_transaction = any(keyword in text for keyword in transaction_keywords)
        has_exclusion = any(keyword in text for keyword in exclude_keywords)
        
        return has_transaction and not has_exclusion
    
    def _extract_amount_from_text(self, text: str) -> Optional[float]:
        """Extrae monto de formato NU"""
        amount = self.extract_amount(text)
        return amount
    
    def _extract_description(self, body: str, subject: str) -> str:
        """Extrae descripción de la transacción"""
        text = body or subject
        
        patterns = [
            r'(?:Compra|Pago)\s+(?:en|a|de)\s+([^\n\.]+)',
            r'Concepto[:\s]+([^\n\.]+)',
            r'([A-Z][^\.\n]{10,50})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                desc = match.group(1)
                desc = re.sub(r'(NU|Notificación)[:\s]*', '', desc, flags=re.IGNORECASE)
                return self.normalize_description(desc)
        
        if subject:
            desc = re.sub(r'^(NU|Notificación)[:\s]*', '', subject, flags=re.IGNORECASE)
            return self.normalize_description(desc)
        
        return self.normalize_description(text[:100] if text else 'Transacción NU')
