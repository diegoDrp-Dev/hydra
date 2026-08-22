import type { FastifyInstance } from "fastify";

import { ScanController } from "../controllers/scan.controller.js";
import { ScansController } from "../controllers/scans.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const scanController = new ScanController();
const scansController = new ScansController();

export async function scanRoutes(app: FastifyInstance) {

  app.addHook("preHandler", authMiddleware);

  // CREATE SCAN
  app.post("/", {
    schema: {
      body: {
        type: "object",

        required: ["url"],

        properties: {
          url: {
            type: "string",
            format: "uri",
            maxLength: 2048,
          },
        },
      },
    },

    handler: scanController.create.bind(scanController),
  });

  // LIST ALL SCANS
  app.get("/", {
    handler: scansController.findAll.bind(scansController),
  });

  // GET SCAN BY ID
  app.get("/:id", {
    handler: scansController.findOne.bind(scansController),
  });
}
