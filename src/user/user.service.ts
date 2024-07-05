import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { RegisterUserDto } from './dto/register.dto';
import { RedisService } from 'src/redis/redis.service';
import {
  createUser,
  validateCaptcha,
  validateRegisterUser,
} from './em/register.em';
import { EmailService } from 'src/email/email.service';
import { md5 } from 'src/utils/utils';
import { Role } from './entity/role.entity';
import { Permission } from './entity/permission.entity';
import { LoginDto } from './dto/login.dto';
import {
  createLoginUserVo,
  signAccessToken,
  signRefreshToken,
  validateLoginUser,
} from './em/login.em';
import { findUserById } from './em/refresh.em';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  @InjectRepository(Role)
  private roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    validateCaptcha(captcha, user.captcha);

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });
    validateRegisterUser(foundUser);

    const newUser = await createUser(foundUser);

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '注册失败';
    }
  }

  async registerCatpcha(address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`captcha_${address}`, code, 5 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<div>
        <p>您好，欢迎注册，</p>
        <p>您的注册验证码是 ${code}</p>
      </div>`,
    });
    return '发送成功';
  }

  async login(loginDto: LoginDto, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        username: loginDto.username,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });
    validateLoginUser(user, loginDto);

    const vo = createLoginUserVo(user);
    vo.accessToken = signAccessToken(
      this.jwtService,
      this.configService,
      vo.userInfo,
    );
    vo.refreshToken = signRefreshToken(
      this.jwtService,
      this.configService,
      vo.userInfo,
    );

    return vo;
  }

  async refresh(refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await findUserById(this.userRepository, data.userId, false);
      const access_token = signAccessToken(
        this.jwtService,
        this.configService,
        user,
      );
      const refresh_token = signRefreshToken(
        this.jwtService,
        this.configService,
        user,
      );
      return {
        access_token,
        refresh_token,
      };
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }
}
