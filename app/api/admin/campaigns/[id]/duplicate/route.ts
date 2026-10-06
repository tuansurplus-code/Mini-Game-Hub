import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function baseSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { user, workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to duplicate campaigns." },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: sourceCampaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name, slug, scheduling_mode, starts_at, ends_at, settings")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (campaignError) throw campaignError;

    if (!sourceCampaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const { data: sourceGames, error: gamesError } = await supabase
      .from("campaign_games")
      .select("id, game_id, display_order, appearance, rules")
      .eq("campaign_id", id)
      .order("display_order", { ascending: true });

    if (gamesError) throw gamesError;

    const copyNameBase = `${sourceCampaign.name} Copy`;
    const slugRoot = baseSlug(copyNameBase) || `${sourceCampaign.slug}-copy`;

    let copyName = copyNameBase;
    let copySlug = slugRoot;
    let suffix = 2;

    while (true) {
      const { data: existing, error: existingError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("slug", copySlug)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existing) break;

      copyName = `${copyNameBase} ${suffix}`;
      copySlug = `${slugRoot}-${suffix}`;
      suffix += 1;
    }

    const { data: newCampaign, error: createCampaignError } = await supabase
      .from("campaigns")
      .insert({
        workspace_id: workspaceId,
        name: copyName,
        slug: copySlug,
        status: "draft",
        scheduling_mode: sourceCampaign.scheduling_mode,
        starts_at: sourceCampaign.starts_at,
        ends_at: sourceCampaign.ends_at,
        settings: sourceCampaign.settings ?? {},
        created_by: user.id,
      })
      .select("id, name, slug, status")
      .single();

    if (createCampaignError) throw createCampaignError;

    try {
      for (const sourceGame of sourceGames ?? []) {
        const publicSlugRoot = `${copySlug}-${sourceGame.game_id.slice(0, 8)}`;
        let publicSlug = publicSlugRoot;
        let publicSuffix = 2;

        while (true) {
          const { data: existingPublicSlug, error: publicSlugError } = await supabase
            .from("campaign_games")
            .select("id")
            .eq("public_slug", publicSlug)
            .maybeSingle();

          if (publicSlugError) throw publicSlugError;
          if (!existingPublicSlug) break;

          publicSlug = `${publicSlugRoot}-${publicSuffix}`;
          publicSuffix += 1;
        }

        const { data: newCampaignGame, error: createGameError } = await supabase
          .from("campaign_games")
          .insert({
            campaign_id: newCampaign.id,
            game_id: sourceGame.game_id,
            public_slug: publicSlug,
            status: "draft",
            display_order: sourceGame.display_order,
            appearance: sourceGame.appearance ?? {},
            rules: sourceGame.rules ?? {},
          })
          .select("id")
          .single();

        if (createGameError) throw createGameError;

        const { data: sourcePrizes, error: prizesError } = await supabase
          .from("prizes")
          .select("name, description, image_url, weight, inventory, active, metadata")
          .eq("campaign_game_id", sourceGame.id)
          .order("created_at", { ascending: true });

        if (prizesError) throw prizesError;

        if (sourcePrizes && sourcePrizes.length > 0) {
          const { error: createPrizesError } = await supabase.from("prizes").insert(
            sourcePrizes.map((prize) => ({
              campaign_game_id: newCampaignGame.id,
              name: prize.name,
              description: prize.description,
              image_url: prize.image_url,
              weight: prize.weight,
              inventory: prize.inventory,
              active: prize.active,
              metadata: prize.metadata ?? {},
            }))
          );

          if (createPrizesError) throw createPrizesError;
        }
      }
    } catch (copyError) {
      await supabase.from("campaigns").delete().eq("id", newCampaign.id);
      throw copyError;
    }

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (error) {
    console.error("Duplicate campaign error:", error);
    return NextResponse.json(
      { error: "Unable to duplicate campaign." },
      { status: 500 }
    );
  }
}
