import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0/helper/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v1.0.0/autocmd/mod.ts";
import {
  ensureNumber,
  ensureString,
} from "https://deno.land/x/unknownutil@v1.0.0/mod.ts";
import * as popup from "https://deno.land/x/denops_popup@v2.0.1/mod.ts";

async function makeEmptyBuffer(denops: Denops): Promise<number> {
  if (await denops.meta.host === "nvim") {
    const bufnr = await denops.call("nvim_create_buf", false, true);
    ensureNumber(bufnr);
    return bufnr;
  } else {
    const name = "dps-popup-test://popup";
    await execute(denops, `badd ${name}`);
    const bufnr = await denops.call("bufnr", `^${name}$`);
    ensureNumber(bufnr);
    await denops.call("setbufvar", bufnr, "&buftype", "nofile");
    return bufnr;
  }
}

async function closeCmd(denops: Denops, winid: number): Promise<string> {
  if (await denops.meta.host === "nvim") {
    return `nvim_win_close(${winid}, v:false)`;
  } else {
    return `popup_close(${winid})`;
  }
}

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async dpsTest(): Promise<void> {
      const currentBufnr = await denops.call("bufnr", "%");
      ensureNumber(currentBufnr);

      const opts = {
        relative: "editor",
        row: 1,
        col: 1,
        width: 20,
        height: 20,
        border: true,
      }; // sample option

      const bufnr = await makeEmptyBuffer(denops);
      ensureNumber(bufnr);

      const popupWinId = await popup.open(denops, bufnr, opts);
      ensureNumber(popupWinId);

      await denops.call("setbufline", bufnr, 1, ["hello", "world"]);

      const cmd = await closeCmd(denops, popupWinId);
      // console.log(cmd);

      await autocmd.group(denops, "dps_float_close", (helper) => {
        helper.remove(
          ["CursorMoved", "CursorMovedI", "VimResized"],
          "*",
        );
        helper.define(
          ["CursorMoved", "CursorMovedI", "VimResized"],
          "*",
          `call ${cmd}`,
          { once: true },
        );
      });

      return await Promise.resolve();
    },
  };

  await execute(
    denops,
    `command! DpsTest call denops#request('${denops.name}', 'dpsTest', [])`,
  );
}
