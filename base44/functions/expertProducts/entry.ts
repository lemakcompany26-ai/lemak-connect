import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const DEFAULT_PRODUCTS = [
  {
    categoryId: "rentals",
    categoryName: "Rentals",
    categoryDescription:
      "Chairs, tables, canopies and event equipment for your occasion.",
    options: [
      {
        optionId: "chairs",
        optionName: "Plastic Chairs",
        description: "Quality plastic chairs for events and gatherings.",
        unitPrice: 500,
      },
      {
        optionId: "tables",
        optionName: "Tables",
        description: "Strong event tables suitable for indoor and outdoor use.",
        unitPrice: 1500,
      },
      {
        optionId: "canopies",
        optionName: "Canopies",
        description: "Large event canopies for parties and ceremonies.",
        unitPrice: 15000,
      },
      {
        optionId: "event_equipment",
        optionName: "Event Equipment",
        description: "Event equipment packages for your occasion.",
        unitPrice: 25000,
      },
    ],
  },

  {
    categoryId: "event-planning",
    categoryName: "Event Planning",
    categoryDescription:
      "Professional event planning and coordination.",
    options: [
      {
        optionId: "wedding",
        optionName: "Wedding Planning",
        description: "Complete wedding planning service.",
        unitPrice: 150000,
      },
      {
        optionId: "birthday",
        optionName: "Birthday Planning",
        description: "Birthday party planning and coordination.",
        unitPrice: 75000,
      },
      {
        optionId: "house-warming",
        optionName: "House Warming",
        description: "House warming event planning.",
        unitPrice: 60000,
      },
      {
        optionId: "corporate",
        optionName: "Corporate Event",
        description: "Corporate event planning and coordination.",
        unitPrice: 150000,
      },
      {
        optionId: "full-planning",
        optionName: "Full Event Planning",
        description: "Complete event planning package.",
        unitPrice: 200000,
      },
    ],
  },

  {
    categoryId: "event-design",
    categoryName: "Event Design & Decor",
    categoryDescription:
      "Event decoration, styling and design.",
    options: [
      {
        optionId: "decoration",
        optionName: "Event Decoration",
        description: "Professional event decoration.",
        unitPrice: 100000,
      },
      {
        optionId: "premium-decoration",
        optionName: "Premium Event Design",
        description: "Premium decoration and event styling.",
        unitPrice: 180000,
      },
      {
        optionId: "stage-design",
        optionName: "Stage Design",
        description: "Custom stage and backdrop design.",
        unitPrice: 80000,
      },
    ],
  },

  {
    categoryId: "water-production",
    categoryName: "Water Production",
    categoryDescription:
      "Water production, packaging and custom branding.",
    options: [
      {
        optionId: "sachet",
        optionName: "Sachet Water",
        description: "Sachet water production service.",
        unitPrice: 25000,
      },
      {
        optionId: "bottled",
        optionName: "Bottled Water",
        description: "Bottled water production.",
        unitPrice: 50000,
      },
      {
        optionId: "custom-branded",
        optionName: "Custom Branded Water",
        description: "Custom branded water for events and businesses.",
        unitPrice: 100000,
      },
      {
        optionId: "bulk",
        optionName: "Bulk Water Production",
        description: "Large-volume water production.",
        unitPrice: 75000,
      },
    ],
  },

  {
    categoryId: "electricity",
    categoryName: "Electricity Engineering",
    categoryDescription:
      "Electrical installation, wiring, maintenance and engineering.",
    options: [
      {
        optionId: "installation",
        optionName: "Electrical Installation",
        description: "Professional electrical installation.",
        unitPrice: 75000,
      },
      {
        optionId: "wiring",
        optionName: "Electrical Wiring",
        description: "Residential and commercial electrical wiring.",
        unitPrice: 100000,
      },
      {
        optionId: "maintenance",
        optionName: "Electrical Maintenance",
        description: "Electrical inspection and maintenance.",
        unitPrice: 50000,
      },
      {
        optionId: "generator",
        optionName: "Generator / Electrical Engineering",
        description: "Generator and electrical engineering services.",
        unitPrice: 100000,
      },
    ],
  },

  {
    categoryId: "fumigation",
    categoryName: "Fumigation",
    categoryDescription:
      "Professional fumigation and pest control services.",
    options: [
      {
        optionId: "home-fumigation",
        optionName: "Home Fumigation",
        description: "Residential fumigation service.",
        unitPrice: 50000,
      },
      {
        optionId: "office-fumigation",
        optionName: "Office Fumigation",
        description: "Commercial and office fumigation.",
        unitPrice: 75000,
      },
      {
        optionId: "large-fumigation",
        optionName: "Large Property Fumigation",
        description: "Large property pest control service.",
        unitPrice: 120000,
      },
    ],
  },

  {
    categoryId: "website-app-development",
    categoryName: "Website & App Development",
    categoryDescription:
      "Professional websites, web applications and mobile applications.",
    options: [
      {
        optionId: "business-website",
        optionName: "Business Website",
        description: "Professional business website.",
        unitPrice: 150000,
      },
      {
        optionId: "ecommerce",
        optionName: "E-commerce Website",
        description: "Online store and e-commerce website.",
        unitPrice: 250000,
      },
      {
        optionId: "mobile-app",
        optionName: "Mobile App",
        description: "Android/iOS mobile application development.",
        unitPrice: 400000,
      },
      {
        optionId: "web-app",
        optionName: "Web Application",
        description: "Custom web application development.",
        unitPrice: 350000,
      },
      {
        optionId: "custom-software",
        optionName: "Custom Software",
        description: "Custom software development.",
        unitPrice: 500000,
      },
    ],
  },
];

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function makeId(categoryId: string, optionId: string) {
  return `${categoryId}-${optionId}`;
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return json(
        {
          ok: false,
          error: "Method not allowed.",
        },
        405
      );
    }

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    let storedProducts: any[] = [];

    try {
      const result = await service.entities.ExpertProduct.list(
        "sortOrder",
        500
      );

      storedProducts = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("ExpertProduct entity error:", error);

      return json(
        {
          ok: false,
          error:
            "ExpertProduct entity is not available. Please create the ExpertProduct entity first.",
          products: [],
        },
        500
      );
    }

    /*
     * If admin has not created products yet, return the default catalogue.
     * This lets the customer page work immediately.
     */
    if (storedProducts.length === 0) {
      const fallback = [];

      for (const category of DEFAULT_PRODUCTS) {
        for (const option of category.options) {
          fallback.push({
            id: makeId(category.categoryId, option.optionId),
            categoryId: category.categoryId,
            categoryName: category.categoryName,
            categoryDescription: category.categoryDescription,
            optionId: option.optionId,
            optionName: option.optionName,
            description: option.description,
            unitPrice: option.unitPrice,
            imageUrl: "",
            active: true,
            sortOrder: fallback.length,
          });
        }
      }

      return json({
        ok: true,
        currency: "NGN",
        products: fallback,
      });
    }

    const products = storedProducts
      .filter((item) => item.active !== false)
      .map((item) => ({
        id:
          item.id ||
          makeId(
            item.categoryId || "service",
            item.optionId || "option"
          ),
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryDescription: item.categoryDescription || "",
        optionId: item.optionId,
        optionName: item.optionName,
        description: item.description || "",
        unitPrice: Number(item.unitPrice || 0),
        imageUrl: item.imageUrl || "",
        active: item.active !== false,
        sortOrder: Number(item.sortOrder || 0),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return json({
      ok: true,
      currency: "NGN",
      products,
    });
  } catch (error) {
    console.error("expertProducts fatal:", error);

    return json(
      {
        ok: false,
        error: "Unable to load Lemak Expert services.",
        products: [],
      },
      500
    );
  }
}

export { DEFAULT_PRODUCTS };
