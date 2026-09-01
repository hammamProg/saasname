import type { Connector, RawSignal } from "@/libs/trends/types";

type HfModel = {
  id: string;
  likes: number;
  downloads: number;
  createdAt: string;
  pipeline_tag?: string;
};

export const huggingFaceConnector: Connector = {
  id: "hugging_face",

  async fetchSignals(): Promise<RawSignal[]> {
    const response = await fetch(
      "https://huggingface.co/api/models?sort=likes&direction=-1&limit=30"
    );

    if (!response.ok) {
      throw new Error(`Hugging Face models API returned ${response.status}`);
    }

    const models = (await response.json()) as unknown;

    // Minimal runtime validation: ensure models is an array
    if (!Array.isArray(models)) {
      throw new Error("Hugging Face models API returned non-array response");
    }

    return models.map((model) => ({
      sourceProvider: "hugging_face",
      sourceType: "app",
      externalId: (model as HfModel).id,
      canonicalUrl: `https://huggingface.co/${(model as HfModel).id}`,
      publishedAt: (model as HfModel).createdAt,
      title: (model as HfModel).id,
      textExcerpt: (model as HfModel).pipeline_tag,
      engagementMetrics: {
        likes: (model as HfModel).likes,
        downloads: (model as HfModel).downloads,
      },
      categoryHint: "ai",
    }));
  },
};
