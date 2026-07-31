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
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
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
}: BaseModalProps) {
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
      isDismissable={!isLoading}
      classNames={{
        base: `bg-white rounded-md shadow-xl overflow-hidden ${className || ''}`,
        header: 'border-b border-gray-200 px-4 py-2.5 bg-slate-50/80 rounded-t-md',
        body: 'px-4 py-3 space-y-3 max-h-[80vh] overflow-y-auto',
        footer: 'border-t border-gray-200 px-4 py-2 bg-slate-50/80 rounded-b-md',
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-0.5">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className={`rounded-md ${iconBgColor} p-1.5 flex items-center justify-center`}>
                    {icon}
                  </div>
                )}
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800 leading-tight">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody>{children}</ModalBody>

            {!hideFooter && (
              <ModalFooter className="flex justify-end gap-2">
                {footerExtra}
                <Button
                  color="danger"
                  variant="solid"
                  size="sm"
                  onPress={onCancel || onClose}
                  isDisabled={isLoading}
                  className="h-8 bg-red-600 hover:bg-red-700 px-3 text-xs font-medium text-white"
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
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
