import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireLogin, RequirePermission, UserInfo } from './custom.decorater';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-guard')
  @RequireLogin()
  @RequirePermission(['ccc'])
  testGuard(
    @UserInfo('username') username: string,
    @UserInfo() userInfo,
  ): string {
    console.log(username, userInfo);
    return 'test-guard';
  }
}
