
export interface T2125Category {
  line: string;
  description: string;
  key: string; 
  explanation: string;
}

// Based on CRA Form T2125, Part 3A
export const t2125IncomeCategories: T2125Category[] = [
  { 
    line: "Part 3A", 
    description: "Sales, commissions, or fees", 
    key: "sales",
    explanation: "This is your main business income. Include all revenue you've earned from your primary business activities, such as selling goods, providing services, or earning commissions." 
  },
  { 
    line: "Part 3D", 
    description: "Other income", 
    key: "other",
    explanation: "Include any other business-related income that is not part of your main sales or services. Examples include recovered bad debts, affiliate income, or rent from a property used in your business."
  },
];

// Based on CRA Form T2125, Part 4 - Expenses
export const t2125ExpenseCategories: T2125Category[] = [
  { 
    line: "8521", 
    description: "Advertising", 
    key: "advertising",
    explanation: "Expenses for promoting your business. This includes online ads, social media campaigns, print ads, flyers, and business cards. Do not include meals and entertainment."
  },
  { 
    line: "8690", 
    description: "Insurance", 
    key: "insurance",
    explanation: "Premiums for general business insurance. This does not include motor vehicle insurance or life insurance."
  },
  { 
    line: "8710", 
    description: "Interest and bank charges", 
    key: "interest",
    explanation: "Bank fees, account service charges, and interest paid on business loans. Do not include interest on your personal home mortgage or car loans unless the vehicle is used for business."
  },
  { 
    line: "8760", 
    description: "Business fees, licences, and dues", 
    key: "feesDues",
    explanation: "Annual membership dues for professional associations, as well as business licenses and permits required for your operation."
  },
  { 
    line: "8810", 
    description: "Office expenses", 
    key: "office",
    explanation: "Minor office expenses like postage, stationery, and other small items. Do not include major purchases like computers or furniture here."
  },
  { 
    line: "8811", 
    description: "Office stationery and supplies", 
    key: "supplies",
    explanation: "Costs for supplies used to provide your service or make your product. For an office, this includes paper, pens, etc. For a tradesperson, this could be small tools and materials not directly billed to a client."
  },
  { 
    line: "8860", 
    description: "Professional fees (includes legal and accounting fees)", 
    key: "professionalFees",
    explanation: "Fees paid to professionals like lawyers, accountants, or consultants for services related to your business."
  },
  { 
    line: "8871", 
    description: "Management and administration fees", 
    key: "managementAdmin",
    explanation: "Fees for managing or administering your business, such as bank administration fees or fees for online payment services."
  },
  { 
    line: "8910", 
    description: "Rent", 
    key: "rent",
    explanation: "Rent paid for your business location (office, workshop, etc.). Do not include rent for your home unless you are claiming business-use-of-home expenses separately."
  },
  { 
    line: "8960", 
    description: "Repairs and maintenance", 
    key: "repairsMaintenance",
    explanation: "Costs to repair and maintain business equipment and property. Do not include major renovations or upgrades, as those may be capital expenses."
  },
  { 
    line: "9060", 
    description: "Salaries, wages, and benefits (including employer's contributions)", 
    key: "salaries",
    explanation: "Gross salaries and wages paid to employees, as well as the employer's share of CPP, EI, and other payroll taxes."
  },
  { 
    line: "9180", 
    description: "Property taxes", 
    key: "propertyTaxes",
    explanation: "Property taxes paid for your business location. If you work from home, this is part of your business-use-of-home expenses."
  },
  { 
    line: "9200", 
    description: "Travel expenses", 
    key: "travel",
    explanation: "Costs for business travel, including flights, hotels, and public transportation. Does not include motor vehicle expenses."
  },
  { 
    line: "9220", 
    description: "Utilities", 
    key: "utilities",
    explanation: "Costs for utilities for your business location, such as heat, electricity, and water. For a home office, this is part of your business-use-of-home expenses."
  },
  { 
    line: "9224", 
    description: "Fuel costs (except for motor vehicles)", 
    key: "fuel",
    explanation: "Fuel costs for machinery and equipment. Do not include fuel for vehicles."
  },
  { 
    line: "9275", 
    description: "Delivery, freight, and express", 
    key: "shipping",
    explanation: "Costs for couriers, shipping, and postage for sending business-related items."
  },
  { 
    line: "9936", 
    description: "Capital cost allowance (CCA)", 
    key: "cca",
    explanation: "The deductible portion of the cost of your capital assets (like computers, vehicles, buildings) for the year. This is usually calculated by an accountant."
  },
  { 
    line: "9270", 
    description: "Other expenses", 
    key: "otherExpenses",
    explanation: "A catch-all category for any other valid business expense that does not fit into the other categories."
  },
];
