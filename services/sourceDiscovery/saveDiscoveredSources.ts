import type { PrismaClient } from "@prisma/client";
import type { ClassifiedSourceCandidate } from "./sourceClassifier";

export async function saveDiscoveredSources(input: {
  prisma: PrismaClient;
  discoveryQueryId: string;
  candidates: ClassifiedSourceCandidate[];
}) {
  let newCount = 0;
  let updatedCount = 0;
  const savedIds: string[] = [];

  for (const candidate of input.candidates) {
    const existing = await input.prisma.discoveredSource.findUnique({
      where: { normalizedUrl: candidate.normalizedUrl },
      select: { id: true, status: true }
    });

    if (existing) {
      const updated = await input.prisma.discoveredSource.update({
        where: { id: existing.id },
        data: {
          discoveryQueryId: input.discoveryQueryId,
          title: candidate.title,
          url: candidate.url,
          description: candidate.description,
          detectedType: candidate.detectedType,
          discoveryType: candidate.discoveryType,
          category: candidate.category,
          confidenceScore: candidate.confidenceScore,
          matchedKeywords: candidate.matchedKeywords.join(", "),
          reason: candidate.reason,
          providerName: candidate.providerName,
          searchUrlTemplateCandidate: candidate.searchUrlTemplateCandidate,
          requiresReview: candidate.requiresReview,
          articlePublishedAt: candidate.articlePublishedAt,
          sourceUsefulness: candidate.sourceUsefulness,
          aiRecommendedAction: candidate.aiRecommendedAction,
          aiCanAutoRegister: candidate.aiCanAutoRegister,
          aiCanAutoEnable: candidate.aiCanAutoEnable,
          aiTrustLevel: candidate.aiTrustLevel,
          aiSourceReason: candidate.aiSourceReason,
          aiRiskReason: candidate.aiRiskReason,
          lastSeenAt: new Date()
        }
      });
      savedIds.push(updated.id);
      updatedCount += 1;
    } else {
      const created = await input.prisma.discoveredSource.create({
        data: {
          discoveryQueryId: input.discoveryQueryId,
          title: candidate.title,
          url: candidate.url,
          normalizedUrl: candidate.normalizedUrl,
          description: candidate.description,
          detectedType: candidate.detectedType,
          discoveryType: candidate.discoveryType,
          category: candidate.category,
          confidenceScore: candidate.confidenceScore,
          matchedKeywords: candidate.matchedKeywords.join(", "),
          reason: candidate.reason,
          providerName: candidate.providerName,
          searchUrlTemplateCandidate: candidate.searchUrlTemplateCandidate,
          requiresReview: candidate.requiresReview,
          articlePublishedAt: candidate.articlePublishedAt,
          sourceUsefulness: candidate.sourceUsefulness,
          aiRecommendedAction: candidate.aiRecommendedAction,
          aiCanAutoRegister: candidate.aiCanAutoRegister,
          aiCanAutoEnable: candidate.aiCanAutoEnable,
          aiTrustLevel: candidate.aiTrustLevel,
          aiSourceReason: candidate.aiSourceReason,
          aiRiskReason: candidate.aiRiskReason,
          status: "new",
          discoveredAt: new Date(),
          lastSeenAt: new Date()
        }
      });
      savedIds.push(created.id);
      newCount += 1;
    }
  }

  return { newCount, updatedCount, savedIds };
}
