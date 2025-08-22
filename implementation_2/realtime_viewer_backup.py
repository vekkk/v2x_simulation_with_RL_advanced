# realtime_viewer.py
import os, sys, math
import pygame
import numpy as np
import torch

from configs.config import Config
from src.simulation.multi_sim import MultiVehicleSim
from src.drl.dqn_agent import DQNAgent

# Colors per RAT
RAT_COLORS = [(66,133,244), (234,67,53), (52,168,83), (156,39,176)]  # blue, red, green, purple
WHITE=(255,255,255); BLACK=(0,0,0); GRAY=(200,200,200); YELLOW=(255,200,0)

W, H = 1100, 600  # window size (pixels)
MARGIN = 60

class Viewer:
    def __init__(self, n_cars=12, use_drl=True, fps=30):
        pygame.init()
        pygame.display.set_caption("Vehicular DRL — Real-Time Viewer")
        self.screen = pygame.display.set_mode((W, H))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("Arial", 16)
        self.big = pygame.font.SysFont("Arial", 20, bold=True)

        self.cfg = Config()
        self.sim = MultiVehicleSim(self.cfg, n_vehicles=n_cars, seed=self.cfg.training.seed)
        self.fps = fps
        self.paused = False
        self.speed_mult = 1
        self.use_drl = use_drl

        # DRL agent
        self.agent = None
        if use_drl:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.agent = DQNAgent(self.cfg.drl, device=device)
            model_path = os.path.join("data", "models", "dqn_final.pt")
            if os.path.exists(model_path):
                self.agent.load(model_path)
                print(f"[Viewer] Loaded DRL model: {model_path}")
            else:
                print("[Viewer] Warning: dqn_final.pt not found. Falling back to heuristic.")
                self.use_drl = False

        self.grid_w, self.grid_h = self.cfg.sim.grid_size

    def chooser(self, sim, state_vec, avail_mask):
        if self.use_drl:
            return int(self.agent.act(state_vec, avail_mask, greedy=True))
        # heuristic: prefer strongest signal if available, else random
        rssi = sim.last_rssi
        valid = np.where(avail_mask == 1)[0]
        if len(valid) > 0:
            best = valid[np.argmax(rssi[valid])]
            return int(best)
        return int(np.random.randint(0, 4))

    def draw_infra(self):
        # Draw lanes
        mid_y = H//2
        for dy in (-60, -20, 20, 60):
            pygame.draw.line(self.screen, GRAY, (MARGIN, mid_y+dy), (W-MARGIN, mid_y+dy), 2)
        # Draw RSU/BS markers (based on spacings)
        rsu_spacing = self.cfg.sim.rsu_spacing_m
        bs_spacing  = self.cfg.sim.bs_spacing_m
        # map meters->pixels on X only
        def mx(xm):
            return MARGIN + int((W - 2*MARGIN) * (xm / self.grid_w))
        # RSUs above road
        y_rsu = mid_y - 100
        for x in np.arange(0, self.grid_w + rsu_spacing, rsu_spacing):
            pygame.draw.rect(self.screen, (0,120,255), (mx(x)-6, y_rsu-6, 12, 12))
        # BS below road
        y_bs = mid_y + 100
        for x in np.arange(0, self.grid_w + bs_spacing, bs_spacing):
            pygame.draw.polygon(self.screen, (80,80,80), [(mx(x), y_bs-8),(mx(x)-8, y_bs+8),(mx(x)+8, y_bs+8)])

        # Axes labels
        self.screen.blit(self.big.render("RSUs", True, (0,120,255)), (MARGIN, y_rsu-28))
        self.screen.blit(self.big.render("Base Stations", True, (80,80,80)), (MARGIN, y_bs+10))

    def draw_hud(self, fps):
        lines = [
            f"FPS: {fps:.0f}  x{self.speed_mult}   Mode: {'DRL' if self.use_drl else 'Heuristic'}",
            "Keys: SPACE pause | +/- speed | D toggle DRL | R reset | Q quit",
        ]
        for i, txt in enumerate(lines):
            self.screen.blit(self.font.render(txt, True, WHITE), (MARGIN, 10 + 18*i))

    def draw_cars(self):
        # map meters->pixels
        def mx(xm):
            return MARGIN + int((W - 2*MARGIN) * (xm / self.grid_w))
        def my(ym):
            # compress meters->pixels around mid screen
            scale = (H - 2*MARGIN) / self.grid_h
            return int(ym * scale + (H - self.grid_h*scale)/2)

        for (x, y, rat_idx, info) in self.sim.get_positions():
            color = RAT_COLORS[rat_idx]
            rect = pygame.Rect(0, 0, 24, 12)
            rect.center = (mx(x), my(y))
            pygame.draw.rect(self.screen, color, rect, border_radius=3)
            pygame.draw.rect(self.screen, BLACK, rect, 2, border_radius=3)
            # tiny heading marker
            pygame.draw.circle(self.screen, YELLOW, (rect.centerx+10, rect.centery), 3)

    def loop(self):
        self.sim.reset()
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        self.paused = not self.paused
                    elif event.key in (pygame.K_PLUS, pygame.K_EQUALS):
                        self.speed_mult = min(8, self.speed_mult+1)
                    elif event.key == pygame.K_MINUS:
                        self.speed_mult = max(1, self.speed_mult-1)
                    elif event.key == pygame.K_r:
                        self.sim.reset()
                    elif event.key == pygame.K_d:
                        self.use_drl = not self.use_drl
                    elif event.key == pygame.K_q:
                        running = False

            if not self.paused:
                # advance multiple sim ticks per frame for speed-up
                for _ in range(self.speed_mult):
                    self.sim.step(lambda sim, s, m: self.chooser(sim, s, m))

            self.screen.fill((18,18,18))
            self.draw_infra()
            self.draw_cars()
            self.draw_hud(self.clock.get_fps())

            pygame.display.flip()
            self.clock.tick(self.fps)

        pygame.quit()

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    mode = sys.argv[2].lower() if len(sys.argv) > 2 else "drl"
    Viewer(n_cars=n, use_drl=(mode == "drl")).loop()
