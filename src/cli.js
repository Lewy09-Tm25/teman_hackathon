import { search } from "./retrieval.js";
import { buildResponse } from "./response.js";
import { proposeConnection } from "./matchmaking.js";

const slug = process.env.EVENT_SLUG || "teman_book_club_nov22";

async function main() {
  const query = process.argv.slice(2).join(" ") || "I'm too shy to go alone";
  const results = await search(query, 3, slug);
  const reply = await buildResponse(query, results, slug);
  const proposal = proposeConnection(results);
  console.log("Reply:\n");
  console.log(reply);
  if (proposal) {
    console.log("\nSuggested buddy:\n");
    console.log(`${proposal.member_name} (${proposal.tags.join(", ")})`);
  }
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
