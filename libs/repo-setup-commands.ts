import config from "@/config";

type RepoSetupCommandInput = {
  name: string;
  slug: string;
  github_repo_url?: string | null;
  github_repo_full_name?: string | null;
};

export function buildRepoSetupCommands({
  name,
  slug,
  github_repo_url,
}: RepoSetupCommandInput): string[] {
  const templateUrl = `${config.links.github}.git`;
  const remoteUrl = github_repo_url ? `${github_repo_url}.git` : null;

  const commands = [
    `git clone ${templateUrl} ${slug}`,
    `cd ${slug}`,
    "rm -rf .git",
    "git init",
    "git add .",
    `git commit -m "Initial commit for ${name} from ShipNow"`,
    "git branch -M main",
  ];

  if (remoteUrl) {
    commands.push(`git remote add origin ${remoteUrl}`, "git push -u origin main");
  } else {
    commands.push(
      "# After creating your GitHub repo above, connect it:",
      `git remote add origin https://github.com/YOUR_USER/${slug}.git`,
      "git push -u origin main"
    );
  }

  commands.push("npm install", "cp .env.example .env.local");

  return commands;
}

export function buildRepoSetupInstructions({
  slug,
  github_repo_url,
  github_repo_full_name,
}: RepoSetupCommandInput): string {
  if (github_repo_url) {
    const repoLabel = github_repo_full_name ?? slug;
    return [
      `Your GitHub repo ${repoLabel} is linked via ShipNow Integrations.`,
      "Run the commands below to clone the ShipNow boilerplate, point origin at your connected repo, and push your first commit.",
      "Then continue with npm install and .env.local before moving to step 2.",
    ].join("\n");
  }

  return [
    "1. Connect GitHub in Integrations (if you have not already).",
    `2. Click "Create repository" above to create ${slug} on your GitHub account.`,
    "3. Run the terminal commands to clone ShipNow and push to your connected repo.",
  ].join("\n");
}
