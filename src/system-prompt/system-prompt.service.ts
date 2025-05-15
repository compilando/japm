import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemPrompt, Prisma } from '@prisma/client';
import { CreateSystemPromptDto, UpdateSystemPromptDto } from './dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SystemPromptService {
  private readonly logger = new Logger(SystemPromptService.name);
  private readonly fileDirectiveRegex = /^\s*\${file\(['"](.+?)['"]\)}\s*$/;

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSystemPromptDto): Promise<SystemPrompt> {
    try {
      return await this.prisma.systemPrompt.create({
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (e.g., name already exists)
        if (error.code === 'P2002') {
          throw new NotFoundException(
            `System prompt with name "${dto.name}" already exists.`, // Consider ConflictException (409) instead?
          );
        }
      }
      throw error; // Re-throw other errors
    }
  }

  async findAll(): Promise<SystemPrompt[]> {
    this.logger.log('Fetching all system prompts');
    const prompts = await this.prisma.systemPrompt.findMany({
      orderBy: { name: 'asc' }, // Order alphabetically by name
    });
    this.logger.debug(
      `Found ${prompts.length} raw system prompts. Data: ${JSON.stringify(prompts)}`,
    );
    // Resolve file directives for all found prompts
    const resolvedPrompts = await Promise.all(
      prompts.map((prompt) => this._resolvePromptObject(prompt)),
    );
    this.logger.debug(
      `Returning ${resolvedPrompts.length} resolved system prompts.`,
    );
    return resolvedPrompts;
  }

  async findOne(id: string): Promise<SystemPrompt | null> {
    const prompt = await this.prisma.systemPrompt.findUnique({
      where: { id },
    });
    if (!prompt) {
      throw new NotFoundException(`System prompt with id "${id}" not found.`);
    }
    // Resolve file directive before returning
    return this._resolvePromptObject(prompt);
  }

  async findOneByName(name: string): Promise<SystemPrompt> {
    const prompt = await this.prisma.systemPrompt.findUnique({
      where: { name },
    });
    if (!prompt) {
      throw new NotFoundException(
        `System prompt with name "${name}" not found.`,
      );
    }
    // Resolve file directive before returning
    return this._resolvePromptObject(prompt);
  }

  async update(
    name: string,
    dto: UpdateSystemPromptDto,
  ): Promise<SystemPrompt> {
    // First check if it exists to provide a NotFoundException if it doesn't
    await this.findOneByName(name);

    try {
      const updatedPrompt = await this.prisma.systemPrompt.update({
        where: { name },
        data: dto,
      });
      // Resolve file directive for the *updated* prompt before returning
      return this._resolvePromptObject(updatedPrompt);
    } catch (error) {
      // Handle potential unique constraint violation if name is updated to an existing one
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new NotFoundException(
          `Cannot update: a system prompt with the new name provided already exists.`, // Consider ConflictException (409)
        );
      }
      throw error;
    }
  }

  async remove(name: string): Promise<SystemPrompt> {
    // First check if it exists
    await this.findOneByName(name);

    // Find the prompt first to potentially log/return info before deleting
    const promptToDelete = await this.findOneByName(name); // Resolves file directive, but ok for delete

    await this.prisma.systemPrompt.delete({
      where: { name },
    });
    // Return the prompt data (with resolved text) as it was before deletion
    return promptToDelete;
  }

  private async _resolvePromptObject(
    prompt: SystemPrompt,
  ): Promise<SystemPrompt> {
    const resolvedText = await this._resolvePromptText(prompt.promptText);
    // Return a new object instance to avoid modifying the original potentially cached object
    return { ...prompt, promptText: resolvedText };
  }

  private async _resolvePromptText(text: string): Promise<string> {
    const match = text.match(this.fileDirectiveRegex);

    if (match && match[1]) {
      const relativePath = match[1];
      const absolutePath = path.resolve(process.cwd(), relativePath);
      this.logger.log(
        `Resolving system prompt from file: ${relativePath} -> ${absolutePath}`,
      );

      try {
        // Security check: Ensure path doesn't try to escape the project root or intended dir (basic check)
        const projectRoot = process.cwd();
        if (
          !absolutePath.startsWith(projectRoot) ||
          absolutePath.includes('..')
        ) {
          this.logger.error(
            `Security Risk: Attempted file access outside project root or using .. : ${relativePath}`,
          );
          throw new InternalServerErrorException(
            `Invalid file path specified for system prompt.`,
          );
        }

        const fileContent = await fs.readFile(absolutePath, 'utf8');
        this.logger.debug(
          `Successfully loaded prompt text from ${relativePath}`,
        );
        return fileContent;
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.error(
            `File not found for system prompt directive: ${absolutePath} (from ${relativePath})`,
          );
          throw new NotFoundException(
            `System prompt file not found: ${relativePath}`,
          );
        } else {
          this.logger.error(
            `Failed to read system prompt file ${absolutePath}: ${error.message}`,
            error.stack,
          );
          throw new InternalServerErrorException(
            `Failed to load system prompt from file: ${relativePath}`,
          );
        }
      }
    } else {
      // Not a file directive, return text as is
      return text;
    }
  }
}
