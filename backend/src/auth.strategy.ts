import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

interface JwtPayload {
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET") ?? process.env.JWT_SECRET;

    if (!secret) {
      const logger = new Logger(JwtStrategy.name);
      logger.warn(
        "JWT_SECRET is not defined. Falling back to dev secret for local startup."
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret ?? "dev-secret",
    });
  }

  validate(payload: JwtPayload) {
    return { email: payload.email };
  }
}
