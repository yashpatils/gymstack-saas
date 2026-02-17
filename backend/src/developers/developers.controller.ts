import { Controller, Get } from '@nestjs/common';

@Controller('developers')
export class DevelopersController {
  @Get()
  getDocs() {
    return {
      openapi: '3.0.0',
      info: { title: 'Gymstack Public API', version: '1.0.0' },
      servers: [{ url: '/api' }],
      paths: {
        '/public/v1/locations': { get: { summary: 'List locations' } },
        '/public/v1/members': { get: { summary: 'List members' } },
        '/public/v1/classes': { get: { summary: 'List classes' } },
        '/public/v1/sessions': { get: { summary: 'List sessions by date range' } },
        '/public/v1/bookings': { post: { summary: 'Create booking' } },
      },
    };
  }
}
