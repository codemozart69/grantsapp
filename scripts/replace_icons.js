const fs = require('fs');
const filepath = 'c:\\\\Users\\\\Win8.1\\\\OneDrive\\\\Desktop\\\\grantsapp\\\\components\\\\component-example.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Replace imports
content = content.replace('import { HugeiconsIcon } from "@hugeicons/react"\\n', '');
const oldImports = 'import { PlusSignIcon, BluetoothIcon, MoreVerticalCircle01Icon, FileIcon, FolderIcon, FolderOpenIcon, CodeIcon, MoreHorizontalCircle01Icon, SearchIcon, FloppyDiskIcon, DownloadIcon, EyeIcon, LayoutIcon, PaintBoardIcon, SunIcon, MoonIcon, ComputerIcon, UserIcon, CreditCardIcon, SettingsIcon, KeyboardIcon, LanguageCircleIcon, NotificationIcon, MailIcon, ShieldIcon, HelpCircleIcon, File01Icon, LogoutIcon } from "@hugeicons/core-free-icons"';
const newImports = 'import { IconPlus, IconBluetooth, IconDotsVertical, IconFile, IconFolder, IconFolderOpen, IconCode, IconDots, IconSearch, IconDeviceFloppy, IconDownload, IconEye, IconLayout, IconPalette, IconSun, IconMoon, IconDeviceDesktop, IconUser, IconCreditCard, IconSettings, IconKeyboard, IconWorld, IconBell, IconMail, IconShield, IconHelp, IconFileText, IconLogout } from "@tabler/icons-react"';
content = content.replace(oldImports, newImports);

// Replace icon rendering
const map = {
    'PlusSignIcon': 'IconPlus',
    'BluetoothIcon': 'IconBluetooth',
    'MoreVerticalCircle01Icon': 'IconDotsVertical',
    'FileIcon': 'IconFile',
    'FolderIcon': 'IconFolder',
    'FolderOpenIcon': 'IconFolderOpen',
    'CodeIcon': 'IconCode',
    'MoreHorizontalCircle01Icon': 'IconDots',
    'SearchIcon': 'IconSearch',
    'FloppyDiskIcon': 'IconDeviceFloppy',
    'DownloadIcon': 'IconDownload',
    'EyeIcon': 'IconEye',
    'LayoutIcon': 'IconLayout',
    'PaintBoardIcon': 'IconPalette',
    'SunIcon': 'IconSun',
    'MoonIcon': 'IconMoon',
    'ComputerIcon': 'IconDeviceDesktop',
    'UserIcon': 'IconUser',
    'CreditCardIcon': 'IconCreditCard',
    'SettingsIcon': 'IconSettings',
    'KeyboardIcon': 'IconKeyboard',
    'LanguageCircleIcon': 'IconWorld',
    'NotificationIcon': 'IconBell',
    'MailIcon': 'IconMail',
    'ShieldIcon': 'IconShield',
    'HelpCircleIcon': 'IconHelp',
    'File01Icon': 'IconFileText',
    'LogoutIcon': 'IconLogout'
};

for (const [oldIcon, newIcon] of Object.entries(map)) {
    const regex = new RegExp(`<HugeiconsIcon icon=\\{${oldIcon}\\}(.*?)\\/>`, 'g');
    content = content.replace(regex, (match, attrs) => {
        let newAttrs = attrs.replace(/strokeWidth=\\{([0-9.]+)\\}/, 'stroke={$1}');
        return `<${newIcon}${newAttrs}/>`;
    });
}

fs.writeFileSync(filepath, content);
console.log('Done');
