import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateSpecialHourInput,
  OpeningHourDto,
  ReplaceOpeningHoursInput,
  SpecialHourDto,
  UpdateSpecialHourInput,
} from '@sternen/shared';
import * as service from '../services/opening-hours.service.js';
import type { OpeningHour, SpecialHour } from '../types/domain.js';

function toOpeningHourDto(entry: OpeningHour): OpeningHourDto {
  return {
    id: entry.id,
    weekday: entry.weekday,
    opensAt: entry.opensAt,
    closesAt: entry.closesAt,
    isEnabled: entry.isEnabled,
  };
}

function toSpecialHourDto(entry: SpecialHour): SpecialHourDto {
  return {
    id: entry.id,
    businessDate: entry.businessDate,
    opensAt: entry.opensAt,
    closesAt: entry.closesAt,
    isClosed: entry.isClosed,
    label: entry.label,
  };
}

export async function listOpeningHoursHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const entries = await service.listOpeningHours(request.server.pool);
  reply.send(entries.map(toOpeningHourDto));
}

export async function replaceOpeningHoursHandler(
  input: ReplaceOpeningHoursInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const entries = await service.replaceOpeningHours(request.server.pool, input);
  reply.send(entries.map(toOpeningHourDto));
}

export async function listSpecialHoursHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const entries = await service.listSpecialHours(request.server.pool);
  reply.send(entries.map(toSpecialHourDto));
}

export async function createSpecialHourHandler(
  input: CreateSpecialHourInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const entry = await service.createSpecialHour(request.server.pool, input);
  reply.status(201).send(toSpecialHourDto(entry));
}

export async function updateSpecialHourHandler(
  id: string,
  input: UpdateSpecialHourInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const entry = await service.updateSpecialHour(request.server.pool, id, input);
  reply.send(toSpecialHourDto(entry));
}

export async function deleteSpecialHourHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await service.deleteSpecialHour(request.server.pool, id);
  reply.status(204).send();
}
