import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyMoltbookIdentity } from "@/lib/moltbook/client";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const verification = await verifyMoltbookIdentity(token);

    if (!verification.valid || !verification.agent) {
      return NextResponse.json(
        { error: verification.error, hint: verification.hint },
        { status: 401 }
      );
    }

    const agent = verification.agent;
    const supabase = await createAdminClient();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("moltbook_agent_id", agent.id)
      .single();

    let profileId = existingProfile?.id;

    if (!existingProfile) {
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          moltbook_agent_id: agent.id,
          profile_type: "candidate",
          name: agent.name,
          bio: agent.description,
          avatar_url: agent.avatar_url,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Profile creation error:", error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }
      profileId = newProfile.id;
    }

    const internalEmail = `${agent.id}@moltin.internal`;

    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(
      (u) => u.email === internalEmail
    );

    if (!userExists) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: internalEmail,
        email_confirm: true,
        user_metadata: {
          moltbook_agent_id: agent.id,
          profile_id: profileId,
        },
      });

      if (createError) {
        console.error("User creation error:", createError);
        return NextResponse.json(
          { error: "Failed to create auth user" },
          { status: 500 }
        );
      }
    }

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: internalEmail,
      });

    if (linkError) {
      console.error("Link generation error:", linkError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile_id: profileId,
      agent: {
        id: agent.id,
        name: agent.name,
      },
      auth_link: linkData.properties?.action_link,
    });
  } catch (error) {
    console.error("Moltbook auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
