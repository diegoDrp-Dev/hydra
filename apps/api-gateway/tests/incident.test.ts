/**
 * Incident Service Tests
 * Unit tests for incident generation and deduplication
 */

import { IncidentService } from "../src/modules/incidents/services/incident.service.js";
import { type DetectedRisk } from "../src/modules/risk-engine/types/index.js";

describe("IncidentService", () => {
  let incidentService: IncidentService;

  beforeEach(() => {
    incidentService = new IncidentService();
  });

  describe("generateFromScan", () => {
    it("should create a new incident from scan", async () => {
      const risks: DetectedRisk[] = [
        {
          ruleId: "http_only",
          ruleName: "HTTP Only",
          severity: "critical",
          score: 40,
          description: "HTTP only site",
        },
      ];

      const result = await incidentService.generateFromScan({
        url: "http://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 40,
        severity: "critical",
        risks,
      });

      expect(result.isNewIncident).toBe(true);
      expect(result.incident).toBeDefined();
      expect(result.incident.title).toContain("CRITICAL");
      expect(result.incident.riskScore).toBe(40);
    });

    it("should detect duplicate incidents", async () => {
      const risks: DetectedRisk[] = [
        {
          ruleId: "http_only",
          ruleName: "HTTP Only",
          severity: "critical",
          score: 40,
          description: "HTTP only site",
        },
      ];

      // First incident
      const result1 = await incidentService.generateFromScan({
        url: "http://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 40,
        severity: "critical",
        risks,
      });

      expect(result1.isNewIncident).toBe(true);
      const firstIncident = result1.incident;

      // Duplicate scan
      const result2 = await incidentService.generateFromScan({
        url: "http://example.com",
        scanId: "scan-2",
        userId: "user-1",
        riskScore: 40,
        severity: "critical",
        risks,
      });

      expect(result2.isDuplicate).toBe(true);
      expect(result2.incident.id).toBe(firstIncident.id);
    });

    it("should generate proper title", async () => {
      const risks: DetectedRisk[] = [];

      const result = await incidentService.generateFromScan({
        url: "https://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 50,
        severity: "high",
        risks,
      });

      expect(result.incident.title).toContain("HIGH");
      expect(result.incident.title).toContain("example.com");
    });
  });

  describe("status management", () => {
    it("should update incident status", async () => {
      const risks: DetectedRisk[] = [];

      const created = await incidentService.generateFromScan({
        url: "https://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 50,
        severity: "high",
        risks,
      });

      const updated = await incidentService.updateStatus(
        created.incident.id,
        "resolved"
      );

      expect(updated.status).toBe("resolved");
    });

    it("should reject invalid status", async () => {
      const risks: DetectedRisk[] = [];

      const created = await incidentService.generateFromScan({
        url: "https://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 50,
        severity: "high",
        risks,
      });

      await expect(
        incidentService.updateStatus(created.incident.id, "invalid_status")
      ).rejects.toThrow();
    });
  });

  describe("retrieval", () => {
    it("should get incident by ID", async () => {
      const risks: DetectedRisk[] = [];

      const created = await incidentService.generateFromScan({
        url: "https://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 50,
        severity: "high",
        risks,
      });

      const retrieved = await incidentService.getIncident(created.incident.id);

      expect(retrieved.id).toBe(created.incident.id);
      expect(retrieved.title).toBe(created.incident.title);
    });

    it("should get user incidents", async () => {
      const risks: DetectedRisk[] = [];

      await incidentService.generateFromScan({
        url: "https://example.com",
        scanId: "scan-1",
        userId: "user-1",
        riskScore: 50,
        severity: "high",
        risks,
      });

      const incidents = await incidentService.getUserIncidents("user-1");

      expect(Array.isArray(incidents)).toBe(true);
      expect(incidents.length).toBeGreaterThan(0);
    });
  });
});
