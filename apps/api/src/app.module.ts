import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckTextController } from './check-text/check-text.controller';
import { CheckTextService } from './check-text/check-text.service';
import { HeuristicTextCheckerService } from './check-text/checkers/heuristic-text-checker.service';
import { OpenAiSemanticTextCheckerService } from './check-text/checkers/openai-semantic-text-checker.service';
import { HybridTextCheckerService } from './check-text/hybrid/hybrid-text-checker.service';
import { CheckYoutubeController } from './check-youtube/check-youtube.controller';
import { CheckYoutubeService } from './check-youtube/check-youtube.service';
import { YoutubeTranscriptProviderService } from './check-youtube/providers/youtube-transcript-provider.service';
import { YoutubeUrlService } from './check-youtube/youtube-url.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [CheckTextController, CheckYoutubeController],
  providers: [
    CheckTextService,
    CheckYoutubeService,
    HeuristicTextCheckerService,
    HybridTextCheckerService,
    OpenAiSemanticTextCheckerService,
    YoutubeTranscriptProviderService,
    YoutubeUrlService,
  ],
})
export class AppModule {}
