"""
Parser para emails de BBVA
WINM - What I Need Most
Principio SOLID: Single Responsibility - Solo parsea emails de BBVA
"""

import re
from typing import Dict, Optional
from .base import BaseParser


class BBVAParser(BaseParser):
    """
    Parser específico para emails de BBVA.
    Implementación simple siguiendo principio KISS.
    """
    
    def __init__(self):
        super().__init__('BBVA')
    
    def parse(self, email_content: Dict) -> Optional[Dict]:
        """
        Parsea email de BBVA y extrae información de transacción.
        
        Args:
            email_content: Contenido del email
        
        Returns:
            Dict con datos de transacción o None si no es válido
        """
        # Filtrar solo emails de transacciones (ignorar otras notificaciones)
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
        
        # Determinar si es ingreso o gasto
        # BBVA generalmente usa "Cargo" para gastos y "Abono" para ingresos
        is_expense = any(word in body.lower() for word in ['cargo', 'compra', 'pago'])
        transaction_type = 'compra' if is_expense else 'ingreso'
        
        # Si es retiro, marcar para categorización
        is_withdrawal = any(word in body.lower() for word in ['retiro', 'retiraste', 'cajero'])
        if is_withdrawal:
            transaction_type = 'retiro'
        
        # Extraer descripción
        description = self._extract_description(body, subject)
        
        # Extraer fecha
        date = self.extract_date(body, email_date)
        
        # Construir transacción
        transaction = {
            'amount': -abs(amount) if is_expense or is_withdrawal else abs(amount),
            'description': description,
            'date': date,
            'source': self.source_name,
            'transaction_type': transaction_type,
            'email_id': email_id,
            'email_subject': subject,
            'needs_categorization': is_withdrawal,
            'bank': self.source_name  # Compatibilidad
        }
        
        # Validar antes de retornar
        if self.validate_transaction(transaction):
            return transaction
        
        return None
    
    def _is_transaction_notification(self, email_content: Dict) -> bool:
        """Verifica si es una notificación de transacción (no otras notificaciones)"""
        subject = email_content.get('subject', '').lower()
        body = email_content.get('body', '').lower()
        text = f"{subject} {body}"
        
        # Palabras que indican transacción
        transaction_keywords = ['cargo', 'abono', 'compra', 'pago', 'retiro', 'transferencia']
        
        # Palabras que indican que NO es transacción
        exclude_keywords = ['promocion', 'promoción', 'oferta', 'publicidad', 'newsletter']
        
        # Debe tener palabras de transacción y NO tener palabras de exclusión
        has_transaction = any(keyword in text for keyword in transaction_keywords)
        has_exclusion = any(keyword in text for keyword in exclude_keywords)
        
        return has_transaction and not has_exclusion
    
    def _extract_amount_from_text(self, text: str) -> Optional[float]:
        """Extrae monto específico de formato BBVA"""
        # BBVA usa formatos como: $1,234.56, MXN$1,234.56, etc.
        amount = self.extract_amount(text)
        return amount
    
    def _extract_description(self, body: str, subject: str) -> str:
        """Extrae descripción de la transacción"""
        # Buscar descripción común en emails de BBVA
        # Patrones comunes: "Compra en", "Pago a", "Retiro en", etc.
        patterns = [
            r'(?:Compra|Pago|Retiro|Transferencia)\s+(?:en|a|de)\s+([^\n\.]+)',
            r'Concepto[:\s]+([^\n\.]+)',
            r'Descripción[:\s]+([^\n\.]+)',
        ]
        
        text = body or subject
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return self.normalize_description(match.group(1))
        
        # Fallback: usar parte del subject o body
        if subject:
            # Remover prefijos comunes de BBVA
            description = re.sub(r'^(BBVA|Notificación|Aviso)[:\s]*', '', subject, flags=re.IGNORECASE)
            return self.normalize_description(description)
        
        return self.normalize_description(body[:100] if body else 'Transacción BBVA')
