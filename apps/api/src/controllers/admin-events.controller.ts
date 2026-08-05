import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateEventInput, EventAdminDto, UpdateEventInput } from '@sternen/shared';
import * as eventsService from '../services/events.service.js';
import type { EventRecord } from '../types/domain.js';

function toAdminDto(event: EventRecord & { areaIds: string[] }): EventAdminDto & { areaIds: string[] } {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    isPublished: event.isPublished,
    publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    areas: [],
    areaIds: event.areaIds,
  };
}

export async function listEventsHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const events = await eventsService.listEventsForAdmin(request.server.pool);
  reply.send(events.map(toAdminDto));
}

export async function getEventHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const event = await eventsService.getEventForAdmin(request.server.pool, id);
  reply.send(toAdminDto(event));
}

export async function createEventHandler(
  input: CreateEventInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminId = request.adminSession!.administrator.id;
  const event = await eventsService.createEvent(request.server.pool, request.server.config, input, adminId);
  const withAreas = await eventsService.getEventForAdmin(request.server.pool, event.id);
  reply.status(201).send(toAdminDto(withAreas));
}

export async function updateEventHandler(
  id: string,
  input: UpdateEventInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminId = request.adminSession!.administrator.id;
  await eventsService.updateEvent(request.server.pool, request.server.config, id, input, adminId);
  const withAreas = await eventsService.getEventForAdmin(request.server.pool, id);
  reply.send(toAdminDto(withAreas));
}

export async function deleteEventHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await eventsService.deleteEvent(request.server.pool, id);
  reply.status(204).send();
}
