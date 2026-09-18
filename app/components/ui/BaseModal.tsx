import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { Save } from 'lucide-react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  size?:
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | 'full';
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  hideFooter?: boolean;
  footerExtra?: React.ReactNode;
  confirmButtonClass?: string;
  confirmIcon?: React.ReactNode;
  className?: string;
  /** Permite cerrar con clic fuera o Escape. Ponlo en false en formularios
   *  donde un cierre accidental haría perder lo que el usuario lleva cargado. */
  isDismissable?: boolean;
  /** 'brand' pinta el header en azul corporativo sólido con texto blanco,
   *  en vez del header gris claro por defecto. */
  variant?: 'default' | 'brand';
  /** Nota pequeña que aparece a la izquierda del footer, junto a los botones. */
  footerNote?: React.ReactNode;
  cancelButtonClass?: string;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-blue-100',
  size = '3xl',
  children,
  confirmText = 'Guardar',
  cancelText = 'Cancelar',
  loadingText = 'Guardando...',
  onConfirm,
  onCancel,
  isLoading = false,
  isConfirmDisabled = false,
  hideFooter = false,
  footerExtra,
  confirmButtonClass = 'bg-brandSecondary hover:bg-brandSecondary-hover text-white',
  confirmIcon = <Save className="h-3.5 w-3.5" />,
  className,
  isDismissable = true,
  variant = 'default',
  footerNote,
  cancelButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
}: BaseModalProps) {
  const isBrand = variant === 'brand';
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
      size={size}
      radius="sm"
      scrollBehavior="inside"
      isDismissable={isDismissable && !isLoading}
      isKeyboardDismissDisabled={!isDismissable}
      classNames={{
        base: `bg-white rounded-md shadow-xl overflow-hidden ${className || ''}`,
        header: isBrand
          ? 'px-4 py-2.5 bg-[#e9ecef] rounded-t-md'
          : 'border-b border-gray-200 px-4 py-2.5 bg-slate-50/80 rounded-t-md',
        body: isBrand ? 'px-4 py-2.5 space-y-2 max-h-[80vh] overflow-y-auto' : 'px-4 py-3 space-y-3 max-h-[80vh] overflow-y-auto',
        footer: isBrand
          ? 'px-4 py-2 bg-white rounded-b-md'
          : 'border-t border-gray-200 px-4 py-2 bg-slate-50/80 rounded-b-md',
        closeButton: isBrand
          ? 'text-gray-500 bg-black/5 hover:bg-black/10 active:bg-black/15 top-2.5 right-3 rounded-md !rounded-md'
          : undefined,
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-0.5">
              <div className="flex items-center gap-3">
                {icon && (
                  <div
                    className={`rounded-md ${iconBgColor} flex items-center justify-center p-1.5`}
                  >
                    {icon}
                  </div>
                )}
                <div className="space-y-0.5">
                  <h2
                    className={
                      isBrand
                        ? 'text-[15px] font-bold leading-tight text-gray-700'
                        : 'text-sm font-bold uppercase leading-tight tracking-wide text-gray-800'
                    }
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p
                      className={
                        isBrand
                          ? 'text-[11.5px] leading-tight text-gray-400'
                          : 'text-[11px] leading-tight text-gray-500'
                      }
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody>{children}</ModalBody>

            {!hideFooter && (
              <ModalFooter className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-gray-400">{footerNote}</div>
                <div className="flex items-center gap-2">
                  {footerExtra}
                  <Button
                    color={isBrand ? undefined : 'danger'}
                    variant="solid"
                    size="sm"
                    onPress={onCancel || onClose}
                    isDisabled={isLoading}
                    className={`h-8 px-3 text-xs font-medium ${cancelButtonClass}`}
                  >
                    {cancelText}
                  </Button>
                  {onConfirm && (
                    <Button
                      size="sm"
                      onPress={onConfirm}
                      startContent={isLoading ? null : confirmIcon}
                      isLoading={isLoading}
                      isDisabled={isLoading || isConfirmDisabled}
                      className={`h-8 px-3 text-xs font-medium ${confirmButtonClass}`}
                    >
                      {isLoading ? loadingText : confirmText}
                    </Button>
                  )}
                </div>
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
