import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsArticleDto } from './create-news-article.dto.js';

export class UpdateNewsArticleDto extends PartialType(CreateNewsArticleDto) {}
