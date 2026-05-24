import { google } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import { validateAction, standardRateLimit } from '@/lib/arcjet';
import { db } from '@/lib/prisma';

const SYSTEM_PROMPT = `
### CORE IDENTITY
You are "Krishi Mitra" (Agriculture Friend), the expert AI assistant for **KrishiConnect**, a B2B marketplace connecting Indian Farmers and Agents.
Your primary role is to assist users with platform operations, marketplace workflows, and general agriculture knowledge. You are NOT a general-purpose AI or a ChatGPT clone.

### QUERY CLASSIFICATION & RESPONSE POLICY
You must classify every user query into one of three categories and respond accordingly:

#### TYPE 1: PLATFORM & WEBSITE RELATED
**Scope:** KrishiConnect workflows, buying/selling, profile creation, verification, delivery, cart restrictions, special requests, OTP, dashboard usage.
**Behavior:**
* MUST answer using actual platform context and real UI workflows.
* MUST aggressively use your tools to fetch real database state (e.g. check request status, search crops).
* NEVER hallucinate fake pages, buttons, menus, or features that don't exist in the codebase.
* Prefer truth over fake confidence. If uncertain about a platform feature, state clearly: "Please check the latest dashboard flow".

**Special Case: Profile Creation Guidance:**
If asked how to register, become a seller, or complete verification, provide this realistic step-by-step guidance based on actual website flow:
1. Sign in using authentication.
2. Select role: Farmer, Agent, or Delivery Person.
3. Complete the profile form.
4. Choose usage purpose: "Buy" or "Buy/Sell".
5. Submit verification details (Aadhar, etc.).
6. Wait for admin approval for selling permissions.
Never invent fake onboarding flows or admin systems.

#### TYPE 2: AGRICULTURE RELATED (NON-PLATFORM)
**Scope:** Farming tips, crop storage, mandi pricing trends, fertilizer basics, logistics concepts.
**Behavior:**
* Answer normally using your general AI knowledge.
* Remain concise, practical, and regionally helpful.
* Tools are optional here.

#### TYPE 3: COMPLETELY UNRELATED
**Scope:** Coding, movies, sports (IPL), politics, general trivia, entertainment.
**Behavior:**
* Politely refuse and redirect the user.
* NO tool usage.
* Use this exact style of response: "I specialize in helping with KrishiConnect marketplace workflows, farming-related guidance, delivery operations, and agriculture commerce assistance."

### KNOWLEDGE BASE (PLATFORM RULES)
1.  **Special Delivery (Out-of-Range):**
    * If a buyer is outside the seller's max delivery range, standard checkout is blocked. They must submit a Special Delivery Request.
    * While PENDING, the item is locked/grayscaled in the cart.
    * Admin contacts seller, negotiates a per-unit fee, and approves a max quantity.
    * Once APPROVED, the product is enabled in the cart. The buyer can checkout up to the approved quantity.
    * If REJECTED, the item is instantly removed from the buyer's cart.
    * Approved requests expire automatically after 10 days via a nightly cron job.
2.  **Delivery Workflow & OTP:**
    * OTP verification is strictly required before final delivery completion.

### LANGUAGE & TONE
* Respond in the language requested by the user. If they speak Hindi or Marathi, respond entirely in that language.
* Tone: Professional yet warm, respectful ("Namaskar", "Ram Ram").
* Keep responses concise and use emojis 🌾 🚜 💰.
`;

export const maxDuration = 30;

export async function POST(req) {
  try {
    try {
      await validateAction(standardRateLimit);
    } catch (arcjetError) {
      if (arcjetError?.message?.includes("moving a bit too fast")) {
        return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw arcjetError;
    }

    const { messages, language } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await currentUser();
    const userId = user?.id ?? null;

    const modelMessages = await convertToModelMessages(messages);

    if (language) {
      const languageContext = `\n[INSTRUCTION: Please reply strictly in ${language} language.]`;
      const last = modelMessages[modelMessages.length - 1];
      if (last?.role === 'user') {
        if (typeof last.content === 'string') {
          last.content += languageContext;
        } else if (Array.isArray(last.content)) {
          const textPart = [...last.content].reverse().find(p => p.type === 'text');
          if (textPart) {
            textPart.text += languageContext;
          } else {
            last.content.push({ type: 'text', text: languageContext });
          }
        }
      }
    }

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      tools: {
        searchMarketplaceProducts: tool({
          description: 'Search for active product listings in the marketplace by crop name or category.',
          inputSchema: z.object({
            query: z.string().describe('The name of the crop or category to search for (e.g., "Wheat", "Tomato", "Fruits")'),
          }),
          execute: async ({ query }) => {
            try {
              const products = await db.productListing.findMany({
                where: {
                  isAvailable: true,
                  availableStock: { gt: 0 },
                  OR: [
                    { productName: { contains: query, mode: 'insensitive' } },
                    { category: { contains: query, mode: 'insensitive' } },
                  ]
                },
                select: {
                  id: true,
                  productName: true,
                  availableStock: true,
                  unit: true,
                  pricePerUnit: true,
                  sellerType: true,
                  farmer: { select: { name: true, city: true } },
                  agent: { select: { name: true, city: true } }
                },
                take: 5
              });
              return products;
            } catch {
              return { error: "Database query failed" };
            }
          },
        }),

        getOutOfRangeRequestStatus: tool({
          description: 'Check the status of special delivery (out-of-range) requests for the current logged-in user.',
          inputSchema: z.object({
            productName: z.string().optional().describe('Filter by a specific product name (optional)')
          }),
          execute: async ({ productName }) => {
            if (!userId) return { error: "User is not logged in." };
            try {
              const whereClause = {
                userId,
                status: { not: 'EXPIRED' }
              };
              if (productName) {
                whereClause.product = {
                  productName: { contains: productName, mode: 'insensitive' }
                };
              }
              const requests = await db.specialDeliveryRequest.findMany({
                where: whereClause,
                include: { product: { select: { productName: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5
              });
              return requests.map(r => ({
                productName: r.product?.productName ?? 'Unknown Product',
                status: r.status,
                requestedQuantity: r.quantity,
                negotiatedFeePerUnit: r.negotiatedFee,
                adminNotes: r.adminNotes,
                requestedAt: r.createdAt,
                approvedAt: r.approvedAt,
                isConsumed: r.isConsumed
              }));
            } catch {
              return { error: "Database query failed" };
            }
          },
        }),

        getUserProfile: tool({
          description: 'Get the role and profile information of the current logged-in user.',
          inputSchema: z.object({}),
          execute: async () => {
            if (!userId) return { error: "User is not logged in." };
            try {
              const userRecord = await db.user.findUnique({
                where: { id: userId },
                select: { role: true, name: true }
              });
              return userRecord || { error: "User profile not found." };
            } catch {
              return { error: "Database query failed" };
            }
          }
        }),

        getDeliveryWorkflowInfo: tool({
          description: 'Retrieve information about the delivery workflow, including OTP requirements and distance calculation.',
          inputSchema: z.object({}),
          execute: async () => ({
            workflow: "Seller hires delivery partner based on OSRM distance.",
            otpVerification: "When the package is picked up, an OTP is generated and sent to the buyer. The buyer MUST provide this OTP to the delivery partner upon arrival to complete the delivery and release payment.",
            fees: "Dynamic delivery fees are calculated per-km using OSRM."
          })
        }),
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    if (error?.message?.includes("moving a bit too fast")) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}