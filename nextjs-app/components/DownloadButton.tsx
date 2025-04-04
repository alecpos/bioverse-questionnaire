import React from 'react';
import { 
  Button, 
  ButtonProps, 
  Icon, 
  Tooltip, 
  IconButton, 
  IconButtonProps 
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';

interface DownloadButtonProps extends Omit<ButtonProps, 'onClick'> {
  // The file format (e.g., CSV, PDF)
  format?: string;
  // The tooltip text to display
  tooltipText?: string;
  // Whether the button should show an outlined or solid style
  variant?: 'solid' | 'outline' | 'ghost';
  // Callback function when download is clicked
  onDownload: () => void;
  // Optional label text (defaults to "Download")
  label?: string;
  // Whether to show the button as loading
  isLoading?: boolean;
  // Whether to show as icon-only button
  iconOnly?: boolean;
  // Icon button props (only used when iconOnly is true)
  iconButtonProps?: Omit<IconButtonProps, 'aria-label' | 'icon' | 'onClick' | 'isLoading'>;
}

/**
 * A reusable download button component for the admin dashboard
 */
const DownloadButton: React.FC<DownloadButtonProps> = ({
  format = 'CSV',
  tooltipText = 'Download data',
  variant = 'outline',
  onDownload,
  label,
  isLoading = false,
  colorScheme = 'blue',
  size = 'sm',
  iconOnly = false,
  iconButtonProps,
  ...rest
}) => {
  const buttonLabel = label || `Download ${format}`;
  const ariaLabel = rest['aria-label'] || tooltipText;
  
  if (iconOnly) {
    return (
      <Tooltip label={tooltipText} placement="top" hasArrow>
        <IconButton
          aria-label={ariaLabel}
          icon={<DownloadIcon />}
          onClick={onDownload}
          variant={variant}
          colorScheme={colorScheme}
          size={size}
          isLoading={isLoading}
          {...iconButtonProps}
        />
      </Tooltip>
    );
  }
  
  return (
    <Tooltip label={tooltipText} placement="top" hasArrow>
      <Button
        leftIcon={<DownloadIcon />}
        onClick={onDownload}
        variant={variant}
        colorScheme={colorScheme}
        size={size}
        isLoading={isLoading}
        {...rest}
      >
        {buttonLabel}
      </Button>
    </Tooltip>
  );
};

export default DownloadButton; 