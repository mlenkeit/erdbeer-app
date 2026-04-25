<?php
declare(strict_types=1);

namespace Tests\Api;

class LeaderboardTest extends ApiTestCase
{
    public function testReturnsAllGroupsRankedByTotalGrams(): void
    {
        $token2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $group2 = seedGroup($this->pdo, $this->seasonId, $token2, ['name' => 'Gruppe B']);

        seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $group2, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 5, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->get("leaderboard/{$this->token}");
        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];
        $board = $data['leaderboard'];

        $this->assertCount(2, $board);
        $this->assertSame($group2, $board[0]['groupId']);
        $this->assertSame($this->groupId, $board[1]['groupId']);
        $this->assertSame(1, $board[0]['rank']);
        $this->assertSame(2, $board[1]['rank']);
    }

    public function testIncludesCurrentGroupId(): void
    {
        $response = $this->http->get("leaderboard/{$this->token}");
        $data = json_decode($response->getBody()->getContents(), true)['data'];

        $this->assertSame($this->groupId, $data['currentGroupId']);
    }

    public function testGapCalculation(): void
    {
        $token2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $token3 = 'cccccccccccccccccccccccccccccccc';
        $group2 = seedGroup($this->pdo, $this->seasonId, $token2, ['name' => 'Gruppe B']);
        $group3 = seedGroup($this->pdo, $this->seasonId, $token3, ['name' => 'Gruppe C']);

        // group2: 2500g, groupId: 1000g, group3: 500g
        seedPurchase($this->pdo, $group2, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 5, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $group3, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->get("leaderboard/{$this->token}");
        $board = json_decode($response->getBody()->getContents(), true)['data']['leaderboard'];

        $this->assertNull($board[0]['gapToNextGrams']);
        $this->assertSame(1500, $board[1]['gapToNextGrams']);
        $this->assertSame(500, $board[2]['gapToNextGrams']);
    }

    public function testTiedGroupsShareRank(): void
    {
        $token2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $group2 = seedGroup($this->pdo, $this->seasonId, $token2, ['name' => 'Gruppe B']);

        seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $group2, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->get("leaderboard/{$this->token}");
        $board = json_decode($response->getBody()->getContents(), true)['data']['leaderboard'];

        $this->assertSame($board[0]['rank'], $board[1]['rank']);
    }

    public function testEmptySeasonAllZeros(): void
    {
        $response = $this->http->get("leaderboard/{$this->token}");
        $board = json_decode($response->getBody()->getContents(), true)['data']['leaderboard'];

        $this->assertCount(1, $board);
        $this->assertSame(0, $board[0]['totalGrams']);
        $this->assertSame(0, $board[0]['purchaseCount']);
    }
}
