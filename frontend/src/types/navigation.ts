// types/navigation.ts
export interface NavbarLink {
    label: string;
    icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & React.RefAttributes<SVGSVGElement>>;
    path: string;
    requiresAdmin?: boolean;
}

export interface NavbarGroup {
    title: string;
    icon?: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & React.RefAttributes<SVGSVGElement>>;
    links: NavbarLink[];
    requiresAdmin?: boolean;
}