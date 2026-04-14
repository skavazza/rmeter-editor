import React, { useState } from 'react';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSidebarGroupProps {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
}

const CollapsibleSidebarGroup: React.FC<CollapsibleSidebarGroupProps> = ({
    label,
    icon,
    children,
    defaultOpen = true,
    className
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <SidebarGroup className={cn("py-0", className)}>
            <SidebarGroupLabel 
                className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="flex items-center justify-center">
                    {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                </div>
            </SidebarGroupLabel>
            {isOpen && (
                <SidebarGroupContent className="animate-in fade-in duration-200">
                    {children}
                </SidebarGroupContent>
            )}
        </SidebarGroup>
    );
};

export default CollapsibleSidebarGroup;
