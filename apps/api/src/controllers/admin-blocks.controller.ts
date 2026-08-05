import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminBlockListQuery, AvailabilityBlockDto, CreateBlockInput, UpdateBlockInput } from '@sternen/shared';
import * as blocksService from '../services/blocks.service.js';
import type { AvailabilityBlock } from '../types/domain.js';
import { localDateTimeToInstant } from '../utils/time.js';

function toDto(block: AvailabilityBlock): AvailabilityBlockDto {
  return {
    id: block.id,
    areaId: block.areaId,
    areaName: block.areaName,
    blockType: block.blockType,
    title: block.title,
    reason: block.reason,
    startsAt: block.startsAt.toISOString(),
    endsAt: block.endsAt.toISOString(),
    blockedCapacity: block.blockedCapacity,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  };
}

export async function listBlocksHandler(
  query: AdminBlockListQuery,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const zone = request.server.config.businessTimeZone;
  const blocks = await blocksService.listBlocks(request.server.pool, {
    areaId: query.areaId,
    from: query.from ? localDateTimeToInstant(zone, query.from, '00:00').toJSDate() : undefined,
    to: query.to ? localDateTimeToInstant(zone, query.to, '23:59').toJSDate() : undefined,
  });
  reply.send(blocks.map(toDto));
}

export async function createBlockHandler(
  input: CreateBlockInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminId = request.adminSession!.administrator.id;
  const block = await blocksService.createBlock(request.server.pool, request.server.config, input, adminId);
  reply.status(201).send(toDto(block));
}

export async function updateBlockHandler(
  id: string,
  input: UpdateBlockInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const block = await blocksService.updateBlock(request.server.pool, request.server.config, id, input);
  reply.send(toDto(block));
}

export async function deleteBlockHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await blocksService.deleteBlock(request.server.pool, id);
  reply.status(204).send();
}
