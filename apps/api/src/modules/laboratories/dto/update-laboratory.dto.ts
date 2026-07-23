import { PartialType } from '@nestjs/mapped-types';
import { CreateLaboratoryDto } from './create-laboratory.dto.js';

export class UpdateLaboratoryDto extends PartialType(CreateLaboratoryDto) {}
