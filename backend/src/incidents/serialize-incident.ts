import { Incident } from '@prisma/client';

export function serializeIncident(incident: Incident) {
  return {
    id: incident.id,
    reason: incident.reason,
    message: incident.message,
    status: incident.status,
    createdAt: incident.createdAt,
    resolvedAt: incident.resolvedAt,
  };
}