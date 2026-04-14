import { Command } from '@tauri-apps/plugin-shell';

export class RainmeterService {
  /**
   * Refreshes a specific skin or the entire Rainmeter app.
   */
  public static async refreshSkin(skinName?: string): Promise<boolean> {
    try {
      const command = skinName 
        ? `!Refresh "${skinName}"`
        : '!RefreshApp';
      
      const cmd = Command.create('rainmeter-refresh', ['Rainmeter.exe', command]);
      await cmd.execute();
      return true;
    } catch (error) {
      console.error('Failed to refresh skin:', error);
      return false;
    }
  }

  /**
   * Executes a Rainmeter bang.
   */
  public static async executeBang(bang: string): Promise<boolean> {
    try {
      const cmd = Command.create('rainmeter-bang', ['Rainmeter.exe', bang]);
      await cmd.execute();
      return true;
    } catch (error) {
      console.error('Failed to execute bang:', error);
      return false;
    }
  }
}
