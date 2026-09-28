import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedStatuses = [
  "draft",
  "scheduled",
  "active",
  "ended",
  "archived",
];

const allowedSchedulingModes = [
  "manual",
  "automatic",
];

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { user, workspaceId, role } =
      await requireAdmin();

    if (
      !["owner", "admin", "editor"].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to update campaigns.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Campaign ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name = String(
      body.name ?? ""
    ).trim();

    const startsAt =
      body.starts_at || null;

    const endsAt =
      body.ends_at || null;

    const status = String(
      body.status ?? ""
    ).trim();

    const schedulingMode = String(
      body.scheduling_mode ?? "manual"
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Campaign name is required.",
        },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign status.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedSchedulingModes.includes(
        schedulingMode
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid scheduling mode.",
        },
        { status: 400 }
      );
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid campaign date or time.",
          },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          {
            error:
              "End date must be after the start date.",
          },
          { status: 400 }
        );
      }
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      return NextResponse.json(
        {
          error:
            "A valid campaign name is required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: campaign,
      error: campaignError,
    } = await supabase
      .from("campaigns")
      .select(
        "id, name, slug, status, scheduling_mode"
      )
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (campaignError) {
      console.error(
        "Load campaign error:",
        campaignError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load campaign.",
        },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Campaign not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: existingCampaign,
      error: slugError,
    } = await supabase
      .from("campaigns")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .neq("id", id)
      .maybeSingle();

    if (slugError) {
      console.error(
        "Check campaign slug error:",
        slugError
      );

      return NextResponse.json(
        {
          error:
            "Unable to validate campaign name.",
        },
        { status: 500 }
      );
    }

    if (existingCampaign) {
      return NextResponse.json(
        {
          error:
            "A campaign with this name already exists.",
        },
        { status: 409 }
      );
    }

    const { data: updatedCampaign, error } =
      await supabase
        .from("campaigns")
        .update({
          name,
          slug,
          status,
          scheduling_mode: schedulingMode,
          starts_at: startsAt,
          ends_at: endsAt,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select(
          `
            id,
            name,
            slug,
            status,
            scheduling_mode,
            starts_at,
            ends_at,
            created_at
          `
        )
        .single();

    if (error) {
      console.error(
        "Update campaign error:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error(
      "Campaign update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update campaign.",
      },
      { status: 500 }
    );
  }
}
