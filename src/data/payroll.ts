
export interface Employee {
    id: string;
    name: string;
    email: string;
    payType: 'hourly' | 'salary';
    payRate: number;
    address?: string;
    homePhone?: string;
    cellPhone?: string;
    hireDate?: Date | null;
    startDate?: Date | null;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hasContract?: boolean;
    specialNeeds?: string;
    notes?: string;
    userId: string;
}

export const mockEmployees: Omit<Employee, 'id' | 'userId'>[] = [
    {
        name: "Alice Johnson",
        email: "alice.j@example.com",
        payType: "salary",
        payRate: 75000,
        address: "123 Maple St, Springfield, USA",
        cellPhone: "555-0101",
        hireDate: new Date("2022-08-15"),
        startDate: new Date("2022-08-22"),
        hasContract: true,
        notes: "Senior Developer on the Phoenix Project."
    },
    {
        name: "Bob Williams",
        email: "bob.w@example.com",
        payType: "hourly",
        payRate: 25.50,
        address: "456 Oak Ave, Springfield, USA",
        cellPhone: "555-0102",
        hireDate: new Date("2023-01-20"),
        startDate: new Date("2023-02-01"),
        hasContract: false,
        notes: "Part-time graphic designer."
    },
    {
        name: "Charlie Brown",
        email: "charlie.b@example.com",
        payType: "hourly",
        payRate: 22.00,
        address: "789 Pine Ln, Springfield, USA",
        cellPhone: "555-0103",
        hireDate: new Date("2023-05-10"),
        startDate: new Date("2023-05-15"),
        hasContract: true,
        notes: "Junior support specialist."
    }
];
