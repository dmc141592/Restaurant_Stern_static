import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AreaAdminDto, CreateAreaInput, UpdateAreaInput } from '@sternen/shared';
import * as areasService from '../services/areas.service.js';
import type { Area } from '../types/domain.js';

function toAdminDto(area: Area): AreaAdminDto {
  return {
    id: area.id,
    slug: area.slug,
    name: area.name,
    description: area.description,
    resourceMode: area.resourceMode,
    capacity: area.capacity,
    defaultDurationMinutes: area.defaultDurationMinutes,
    slotIntervalMinutes: area.slotIntervalMinutes,
    isActive: area.isActive,
    isOnlineBookable: area.isOnlineBookable,
    sortOrder: area.sortOrder,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

export async function listAreasHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const areas = await areasService.listAreas(request.server.pool);
  reply.send(areas.map(toAdminDto));
}

export async function createAreaHandler(
  input: CreateAreaInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const area = await areasService.createArea(request.server.pool, input);
  reply.status(201).send(toAdminDto(area));
}

export async function updateAreaHandler(
  id: string,
  input: UpdateAreaInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const area = await areasService.updateArea(request.server.pool, id, input);
  reply.send(toAdminDto(area));
}
