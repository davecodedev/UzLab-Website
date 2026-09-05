import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StandardsService } from './standards.service.js';
import { ListStandardsDto } from './dto/list-standards.dto.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { MembershipService } from '../membership/membership.service.js';
import { AccessTier } from '../../common/access/viewer.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-request.js';

/**
 * Browsing the catalogue is open to everyone; searching and filtering it is
 * what a membership buys.
 *
 * That split is enforced here rather than only in the browser. The page hides
 * the search box from a non-member, but hiding a control is not access
 * control — without this an unfiltered `curl` with `?q=` would walk straight
 * past it.
 */
const MEMBER_ONLY_PARAMS = [
  'q',
  'register',
  'status',
  'ics',
  'language',
  'yearFrom',
  'yearTo',
] as const satisfies readonly (keyof ListStandardsDto)[];

@Controller('standards')
export class StandardsController {
  constructor(
    private readonly standards: StandardsService,
    private readonly membership: MembershipService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Query() query: ListStandardsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const narrowing = MEMBER_ONLY_PARAMS.filter(
      (key) => query[key] !== undefined && query[key] !== '',
    );

    if (narrowing.length > 0) {
      const { tier } = await this.membership.access(user);
      if (tier !== AccessTier.FULL) {
        // 403 rather than a silently unfiltered list: quietly ignoring the
        // filters would hand back the wrong answer to a question that was
        // asked plainly, which is worse than refusing it.
        throw new ForbiddenException(
          'Searching and filtering the catalogue is available to UzLab members. Browsing it is open to everyone.',
        );
      }
    }

    // Paging and sorting stay open: they are how anyone reads a list of
    // 127,000 documents, not a way of searching it.
    return this.standards.list(query);
  }

  /** Declared before :slug so "facets" is not read as one. */
  @Get('facets')
  facets() {
    return this.standards.facets();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.standards.getBySlug(slug);
  }
}
