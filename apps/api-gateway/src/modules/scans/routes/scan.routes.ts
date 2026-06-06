import type { FastifyInstance } from "fastify";

import { ScanController } from "../controllers/scan.controller.js";
import { ScansController } from "../controllers/scans.controller.js";

const scanController = new ScanController();
const scansController = new ScansController();

export async function scanRoutes(app: FastifyInstance) {

  // CREATE SCAN
  app.post("/", {
    schema: {
      body: {
        type: "object",

        required: ["url"],

        properties: {
          url: {
            type: "string",
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