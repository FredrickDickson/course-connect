import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETUP_KEY = "CIMA_ADMIN_SETUP_2024";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, password, setupKey, checkOnly, createByAdmin } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { data: existingAdmins } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    const adminAlreadyExists = existingAdmins && existingAdmins.length > 0;

    // Check-only mode: return admin existence status
    if (checkOnly) {
      return new Response(JSON.stringify({ adminExists: adminAlreadyExists }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Creating additional admin by an existing admin
    if (createByAdmin) {
      // Verify the requesting user is an admin via Authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await anonClient.auth.getUser();
      if (claimsError || !claimsData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if requesting user is admin
      const { data: requestingUser } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", claimsData.user.id)
        .single();

      if (requestingUser?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Only admins can create admin accounts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // First-time setup: require setup key and no existing admin
      if (adminAlreadyExists) {
        return new Response(JSON.stringify({ error: "An admin account already exists. Additional admins must be created from the admin dashboard." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (setupKey !== SETUP_KEY) {
        return new Response(JSON.stringify({ error: "Invalid setup key" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error("Failed to create user");

    // Insert into users table with admin role
    const { error: insertError } = await supabaseAdmin.from("users").upsert({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "admin",
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
