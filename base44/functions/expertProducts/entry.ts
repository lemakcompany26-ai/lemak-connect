import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const PRODUCTS = [
  {
    id: "rentals",
    name: "Rentals",
    description: "Chairs, tables, canopies and event equipment.",
    options: [
      { id: "chairs", name: "Plastic Chairs", unitPrice: 500 },
      { id: "tables", name: "Tables", unitPrice: 1500 },
      { id: "canopies", name: "Canopies", unitPrice: 15000 },
      {
        id: "event_equipment",
        name: "Event Equipment",
        unitPrice: 25000,
      },
    ],
  },

  {
    id: "event-planning",
    name: "Event Planning",
    description: "Professional event planning and decoration.",
    options: [
      {
        id: "wedding",
        name: "Wedding Planning",
        unitPrice: 150000,
      },
      {
        id: "birthday",
        name: "Birthday Planning",
        unitPrice: 75000,
      },
      {
        id: "house-warming",
        name: "House Warming",
        unitPrice: 60000,
      },
      {
        id: "corporate",
        name: "Corporate Event",
        unitPrice: 150000,
      },
      {
        id: "full-planning",
        name: "Full Event Planning",
        unitPrice: 200000,
      },
      {
        id: "decoration",
        name: "Event Decoration",
        unitPrice: 100000,
      },
    ],
  },

  {
    id: "water-production",
    name: "Water Production",
    description: "Water production and custom branding.",
    options: [
      {
        id: "sachet",
        name: "Sachet Water",
        unitPrice: 25000,
      },
      {
        id: "bottled",
        name: "Bottled Water",
        unitPrice: 50000,
      },
      {
        id: "custom-branded",
        name: "Custom Branded Water",
        unitPrice: 100000,
      },
      {
        id: "bulk",
        name: "Bulk Water Production",
        unitPrice: 75000,
      },
    ],
  },

  {
    id: "electricity",
    name: "Electricity",
    description: "Electrical installation, wiring and maintenance.",
    options: [
      {
        id: "installation",
        name: "Electrical Installation",
        unitPrice: 75000,
      },
      {
        id: "wiring",
        name: "Electrical Wiring",
        unitPrice: 100000,
      },
      {
        id: "maintenance",
        name: "Electrical Maintenance",
        unitPrice: 50000,
      },
      {
        id: "generator",
        name: "Generator / Electrical Engineering",
        unitPrice: 100000,
      },
    ],
  },

  {
    id: "website-app-development",
    name: "Website & App Development",
    description: "Professional website and application development.",
    options: [
      {
        id: "business-website",
        name: "Business Website",
        unitPrice: 150000,
      },
      {
        id: "ecommerce",
        name: "E-commerce Website",
        unitPrice: 250000,
      },
      {
        id: "mobile-app",
        name: "Mobile App",
        unitPrice: 400000,
      },
      {
        id: "web-app",
        name: "Web Application",
        unitPrice: 350000,
      },
      {
        id: "custom-software",
        name: "Custom Software",
        unitPrice: 500000,
      },
    ],
  },
];

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    return Response.json({
      ok: true,
      currency: "NGN",
      products: PRODUCTS,
    });
  } catch (error) {
    console.error("expertProducts:", error);

    return Response.json(
      {
        error: "Unable to load Lemak Expert Product services.",
      },
      { status: 500 }
    );
  }
}

export { PRODUCTS };
